import { describe, expect, it } from "../vitest";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// The Rust route is one decision: oxide locally, Cargo in CI, Cargo only on the
// explicit `EFFIGY_OXIDE_ESCAPE=cargo` escape, and a missing or refusing oxide
// reported rather than bypassed. These tests bound stub `oxide` and `cargo`
// executables so the routing, argument passing, exit statuses and the changed
// proof scripts' cleanup are proven without a real Rust build.

const RUNNER = join(import.meta.dir, "../../scripts/oxide-rust-runner.sh");
const PACKAGE_PROOF = join(import.meta.dir, "../../scripts/check-rust-package.ts");
const CONSUMER_PROOF = join(import.meta.dir, "../../scripts/check-git-consumer.ts");
const VERSION = "9.9.9";
const FIXTURE = '{"blocks":[]}';

const OXIDE_STUB = `#!/bin/sh
printf 'oxide %s\\n' "$*" >> "$STUB_LOG"
manifest=""
case "$1" in
  exec)
    shift
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --manifest-path) manifest=$2; shift 2 ;;
        --) shift; break ;;
        *) shift ;;
      esac
    done
    prepared=no
    if [ -d "$(dirname "$manifest")/.git" ] && grep -qx '/target' "$(dirname "$manifest")/.gitignore" 2>/dev/null; then
      prepared=yes
    fi
    printf 'prepared %s %s\\n' "$prepared" "$manifest" >> "$STUB_LOG"
    if [ "\${STUB_OXIDE_EXIT:-0}" -ne 0 ]; then
      printf 'oxide: refusing to build in %s\\n' "$STUB_TARGET" >&2
      exit "$STUB_OXIDE_EXIT"
    fi
    CARGO_TARGET_DIR=$STUB_TARGET exec "$@"
    ;;
esac
if [ "\${STUB_OXIDE_EXIT:-0}" -ne 0 ]; then
  printf 'oxide: refusing to build in %s\\n' "$STUB_TARGET" >&2
  exit "$STUB_OXIDE_EXIT"
fi
exec cargo "$@"
`;

const CARGO_STUB = `#!/bin/sh
printf 'cargo %s\\n' "$*" >> "$STUB_LOG"
if [ "\${STUB_CARGO_EXIT:-0}" -ne 0 ]; then
  exit "$STUB_CARGO_EXIT"
fi
target=\${CARGO_TARGET_DIR:-$PWD/target}
case "$1" in
  metadata)
    printf '{"target_directory":"%s"}\\n' "$target"
    ;;
  package)
    mkdir -p "$target/package"
    stage=$(mktemp -d "$STUB_SCRATCH/stage.XXXXXX")
    crate=$stage/nightfire-$STUB_VERSION
    mkdir -p "$crate/fixtures/wire/v1"
    printf '%s' "$STUB_FIXTURE" > "$crate/fixtures/wire/v1/nightfire-values.json"
    printf '[package]\\nname = "nightfire"\\n' > "$crate/Cargo.toml"
    tar -czf "$target/package/nightfire-$STUB_VERSION.crate" -C "$stage" "nightfire-$STUB_VERSION"
    rm -rf "$stage"
    ;;
esac
exit 0
`;

type Sandbox = {
  dir: string;
  bin: string;
  log: string;
  tmp: string;
  env: (extra?: Record<string, string>) => Record<string, string>;
  calls: () => Promise<string[]>;
};

async function createSandbox(tools: { oxide?: boolean; cargo?: boolean } = {}): Promise<Sandbox> {
  const dir = await mkdtemp(join(tmpdir(), "nightfire-route-"));
  const bin = join(dir, "bin");
  const tmp = join(dir, "tmp");
  for (const path of [bin, tmp, join(dir, "target"), join(dir, "scratch")]) {
    await mkdir(path, { recursive: true });
  }
  const stubs: [string, string][] = [
    ["oxide", OXIDE_STUB],
    ["cargo", CARGO_STUB],
  ];
  for (const [name, body] of stubs) {
    if (tools[name as "oxide" | "cargo"] === false) continue;
    const path = join(bin, name);
    await writeFile(path, body);
    await chmod(path, 0o755);
  }
  const log = join(dir, "calls.log");
  await writeFile(log, "");
  const env = (extra: Record<string, string> = {}) => ({
    ...process.env,
    PATH: `${bin}:/usr/bin:/bin`,
    STUB_LOG: log,
    STUB_TARGET: join(dir, "target"),
    STUB_SCRATCH: join(dir, "scratch"),
    STUB_VERSION: VERSION,
    STUB_FIXTURE: FIXTURE,
    TMPDIR: tmp,
    GITHUB_ACTIONS: "",
    EFFIGY_OXIDE_ESCAPE: "",
    ...extra,
  });
  const calls = async () =>
    (await readFile(log, "utf8")).split("\n").filter((line) => line.length > 0);
  return { dir, bin, log, tmp, env, calls };
}

async function withSandbox(
  tools: { oxide?: boolean; cargo?: boolean },
  body: (sandbox: Sandbox) => Promise<void>,
): Promise<void> {
  const sandbox = await createSandbox(tools);
  try {
    await body(sandbox);
  } finally {
    await rm(sandbox.dir, { recursive: true, force: true });
  }
}

function spawn(
  command: string[],
  env: Record<string, string>,
  cwd?: string,
): { code: number | null; stdout: string; stderr: string } {
  const child = Bun.spawnSync(command, {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60_000,
  });
  return {
    code: child.exitCode,
    stdout: child.stdout.toString(),
    stderr: child.stderr.toString(),
  };
}

function route(args: string[], env: Record<string, string>) {
  return spawn(["/bin/sh", RUNNER, ...args], env);
}

async function prepareWorkspace(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  const init = spawn(["git", "init", "-q"], { ...process.env }, directory);
  expect(init.code).toBe(0);
  await writeFile(join(directory, ".gitignore"), "/target\n");
}

describe("Rust route", () => {
  it("runs local Cargo commands through oxide and keeps their arguments", async () => {
    await withSandbox({}, async (sandbox) => {
      const result = route(["run", "check", "--workspace", "--all-targets", "--locked"], sandbox.env());
      expect(result.code).toBe(0);
      expect(await sandbox.calls()).toEqual([
        "oxide check --workspace --all-targets --locked",
        "cargo check --workspace --all-targets --locked",
      ]);
    });
  }, 30_000);

  it("uses Cargo when GITHUB_ACTIONS is true and preserves its exit status", async () => {
    await withSandbox({}, async (sandbox) => {
      const ok = route(["run", "test", "--workspace", "--locked"], sandbox.env({ GITHUB_ACTIONS: "true" }));
      expect(ok.code).toBe(0);
      expect(await sandbox.calls()).toEqual(["cargo test --workspace --locked"]);

      await writeFile(sandbox.log, "");
      const failed = route(
        ["run", "test", "--workspace", "--locked"],
        sandbox.env({ GITHUB_ACTIONS: "true", STUB_CARGO_EXIT: "5" }),
      );
      expect(failed.code).toBe(5);
      expect(await sandbox.calls()).toEqual(["cargo test --workspace --locked"]);
    });
  }, 30_000);

  it("uses Cargo only on the explicit escape", async () => {
    await withSandbox({}, async (sandbox) => {
      const result = route(
        ["run", "clippy", "--workspace", "--all-targets", "--locked", "--", "-D", "warnings"],
        sandbox.env({ EFFIGY_OXIDE_ESCAPE: "cargo" }),
      );
      expect(result.code).toBe(0);
      expect(await sandbox.calls()).toEqual([
        "cargo clippy --workspace --all-targets --locked -- -D warnings",
      ]);
    });
  }, 30_000);

  it("refuses an unsupported escape value instead of picking a route", async () => {
    await withSandbox({}, async (sandbox) => {
      const result = route(["run", "check"], sandbox.env({ EFFIGY_OXIDE_ESCAPE: "maybe" }));
      expect(result.code).toBe(2);
      expect(result.stderr).toContain("unsupported EFFIGY_OXIDE_ESCAPE value: maybe");
      expect(result.stderr).toContain("supported: cargo");
      expect(await sandbox.calls()).toEqual([]);
    });
  }, 30_000);

  it("reports a missing oxide without falling back to Cargo", async () => {
    await withSandbox({ oxide: false }, async (sandbox) => {
      const result = route(["run", "check", "--workspace", "--locked"], sandbox.env());
      expect(result.code).toBe(127);
      expect(result.stderr).toContain("oxide is not on PATH");
      expect(result.stderr).toContain("EFFIGY_OXIDE_ESCAPE=cargo");
      expect(result.stderr).not.toContain(":cargo");
      expect(await sandbox.calls()).toEqual([]);
    });
  }, 30_000);

  it("reports an oxide refusal and keeps its exit status", async () => {
    await withSandbox({}, async (sandbox) => {
      const result = route(
        ["run", "test", "--workspace", "--locked"],
        sandbox.env({ STUB_OXIDE_EXIT: "101" }),
      );
      expect(result.code).toBe(101);
      expect(result.stderr).toContain("oxide: refusing to build in");
      expect(result.stderr).toContain("EFFIGY_OXIDE_ESCAPE=cargo");
      expect(await sandbox.calls()).toEqual(["oxide test --workspace --locked"]);
    });
  }, 30_000);

  it("binds one tool to one workspace through oxide exec", async () => {
    await withSandbox({}, async (sandbox) => {
      const workspace = join(sandbox.dir, "workspace");
      await prepareWorkspace(workspace);
      const manifest = join(workspace, "Cargo.toml");
      const result = route(
        ["tool", manifest, "--", "cargo", "package", "-p", "nightfire", "--locked"],
        sandbox.env(),
      );
      expect(result.code).toBe(0);
      expect(await sandbox.calls()).toEqual([
        `oxide exec --manifest-path ${manifest} -- cargo package -p nightfire --locked`,
        `prepared yes ${manifest}`,
        "cargo package -p nightfire --locked",
      ]);
    });
  }, 30_000);

  it("runs a bound tool directly in CI and preserves its exit status", async () => {
    await withSandbox({}, async (sandbox) => {
      const manifest = join(sandbox.dir, "workspace", "Cargo.toml");
      const result = route(
        ["tool", manifest, "--", "cargo", "run", "--quiet"],
        sandbox.env({ GITHUB_ACTIONS: "true", STUB_CARGO_EXIT: "3" }),
      );
      expect(result.code).toBe(3);
      expect(await sandbox.calls()).toEqual(["cargo run --quiet"]);
    });
  }, 30_000);

  it("reports the selected route", async () => {
    await withSandbox({}, async (sandbox) => {
      expect(route(["mode"], sandbox.env()).stdout.trim()).toBe("oxide");
      expect(route(["mode"], sandbox.env({ GITHUB_ACTIONS: "true" })).stdout.trim()).toBe("cargo");
      expect(route(["mode"], sandbox.env({ EFFIGY_OXIDE_ESCAPE: "cargo" })).stdout.trim()).toBe("cargo");
    });
  }, 30_000);
});

async function createProofRoot(sandbox: Sandbox): Promise<string> {
  const root = join(sandbox.dir, "repo");
  await mkdir(join(root, "fixtures/wire/v1"), { recursive: true });
  await writeFile(join(root, "package.json"), `{"version":"${VERSION}"}\n`);
  await writeFile(join(root, "Cargo.toml"), '[workspace]\nmembers = ["rust/nightfire"]\n');
  await writeFile(join(root, "fixtures/wire/v1/nightfire-values.json"), FIXTURE);
  return root;
}

describe("proof script routing", () => {
  it("routes the package proof through oxide exec and cleans up", async () => {
    await withSandbox({}, async (sandbox) => {
      const root = await createProofRoot(sandbox);
      const result = spawn([process.execPath, PACKAGE_PROOF], sandbox.env(), root);
      expect(result.stderr).toBe("");
      expect(result.code).toBe(0);
      expect(result.stdout).toContain(`Cargo package proof passed: unpacked nightfire ${VERSION}`);

      const calls = await sandbox.calls();
      const rootManifest = join(root, "Cargo.toml");
      expect(calls).toContain(
        `oxide exec --manifest-path ${rootManifest} -- cargo metadata --no-deps --format-version 1`,
      );
      expect(calls).toContain(
        `oxide exec --manifest-path ${rootManifest} -- cargo package -p nightfire --locked`,
      );
      const unpackedExec = calls.find(
        (line) => line.startsWith("oxide exec --manifest-path ") && line.includes("/unpacked/"),
      );
      expect(unpackedExec).toBeDefined();
      expect(unpackedExec!.startsWith(`oxide exec --manifest-path ${sandbox.tmp}/nightfire-crate-`)).toBe(
        true,
      );
      expect(unpackedExec!.endsWith(`/unpacked/nightfire-${VERSION}/Cargo.toml -- cargo test --locked`)).toBe(
        true,
      );
      const prepared = calls.filter((line) => line.startsWith("prepared ") && line.includes("/unpacked/"));
      expect(prepared).toHaveLength(1);
      expect(prepared[0]!.startsWith("prepared yes ")).toBe(true);
      expect(prepared[0]!.endsWith(`/unpacked/nightfire-${VERSION}/Cargo.toml`)).toBe(true);
      expect(calls).toContain("cargo test --locked");
      expect(await readdir(sandbox.tmp)).toEqual([]);
    });
  }, 60_000);

  it("fails the package proof on a fixture mismatch and still cleans up", async () => {
    await withSandbox({}, async (sandbox) => {
      const root = await createProofRoot(sandbox);
      const result = spawn(
        [process.execPath, PACKAGE_PROOF],
        sandbox.env({ STUB_FIXTURE: '{"blocks":[1]}' }),
        root,
      );
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain("packaged Cargo fixture differs from the root fixture");
      expect(result.stdout).not.toContain("Cargo package proof passed");
      expect(await readdir(sandbox.tmp)).toEqual([]);
    });
  }, 60_000);

  it("keeps the package proof on Cargo in CI", async () => {
    await withSandbox({}, async (sandbox) => {
      const root = await createProofRoot(sandbox);
      const result = spawn([process.execPath, PACKAGE_PROOF], sandbox.env({ GITHUB_ACTIONS: "true" }), root);
      expect(result.code).toBe(0);
      const calls = await sandbox.calls();
      expect(calls.some((line) => line.startsWith("oxide"))).toBe(false);
      expect(calls.some((line) => line.startsWith("prepared"))).toBe(false);
      expect(calls).toContain("cargo package -p nightfire --locked");
      expect(calls).toContain("cargo test --locked");
      expect(await readdir(sandbox.tmp)).toEqual([]);
    });
  }, 60_000);

  it("routes the Cargo git consumer through oxide exec against its own manifest", async () => {
    await withSandbox({}, async (sandbox) => {
      const root = join(sandbox.dir, "consumer-repo");
      await mkdir(root, { recursive: true });
      for (const command of [
        ["git", "init", "-q"],
        ["git", "config", "user.email", "proof@example.com"],
        ["git", "config", "user.name", "Proof"],
        ["git", "commit", "-q", "--allow-empty", "-m", "proof"],
        ["git", "remote", "add", "origin", "https://github.com/inflatable-cookie/nightfire.git"],
      ]) {
        const step = spawn(command, { ...process.env }, root);
        expect(step.code).toBe(0);
      }
      const revision = spawn(["git", "rev-parse", "HEAD"], { ...process.env }, root).stdout.trim();

      const result = spawn([process.execPath, CONSUMER_PROOF, "cargo"], sandbox.env(), root);
      expect(result.stderr).toBe("");
      expect(result.code).toBe(0);
      expect(result.stdout).toContain(`cargo Git-consumer proof passed at ${revision}`);

      const calls = await sandbox.calls();
      const exec = calls.find((line) => line.startsWith("oxide exec --manifest-path "));
      expect(exec).toBeDefined();
      expect(exec!.startsWith(`oxide exec --manifest-path ${sandbox.tmp}/nightfire-cargo-consumer-`)).toBe(true);
      expect(exec!.endsWith("/Cargo.toml -- cargo run --quiet")).toBe(true);
      expect(calls.filter((line) => line.startsWith("prepared yes "))).toHaveLength(1);
      expect(await readdir(sandbox.tmp)).toEqual([]);
    });
  }, 60_000);

  it("keeps the Cargo git consumer on Cargo in CI", async () => {
    await withSandbox({}, async (sandbox) => {
      const root = join(sandbox.dir, "consumer-repo");
      await mkdir(root, { recursive: true });
      for (const command of [
        ["git", "init", "-q"],
        ["git", "config", "user.email", "proof@example.com"],
        ["git", "config", "user.name", "Proof"],
        ["git", "commit", "-q", "--allow-empty", "-m", "proof"],
        ["git", "remote", "add", "origin", "https://github.com/inflatable-cookie/nightfire.git"],
      ]) {
        const step = spawn(command, { ...process.env }, root);
        expect(step.code).toBe(0);
      }

      const result = spawn(
        [process.execPath, CONSUMER_PROOF, "cargo"],
        sandbox.env({ GITHUB_ACTIONS: "true" }),
        root,
      );
      expect(result.code).toBe(0);
      const calls = await sandbox.calls();
      expect(calls.some((line) => line.startsWith("oxide"))).toBe(false);
      expect(calls).toEqual(["cargo run --quiet"]);
      expect(await readdir(sandbox.tmp)).toEqual([]);
    });
  }, 60_000);
});
