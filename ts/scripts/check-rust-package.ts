import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function run(command: string[], cwd: string, env: Record<string, string> = {}): void {
  const child = Bun.spawnSync(command, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit"
  });
  if (child.exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed`);
  }
}

const root = process.cwd();
const manifest = await Bun.file(join(root, "package.json")).json();
const destination = await mkdtemp(join(tmpdir(), "nightfire-crate-"));

try {
  const packageTarget = join(destination, "package-target");
  run(["cargo", "package", "-p", "nightfire", "--locked"], root, {
    CARGO_TARGET_DIR: packageTarget
  });

  const crate = join(
    packageTarget,
    "package",
    `nightfire-${manifest.version}.crate`
  );
  const unpacked = join(destination, "unpacked");
  await mkdir(unpacked);
  run(["tar", "-xzf", crate, "-C", unpacked], root);

  const packageRoot = join(unpacked, `nightfire-${manifest.version}`);
  const canonicalFixture = await Bun.file(
    join(root, "fixtures/wire/v1/nightfire-values.json")
  ).text();
  const packagedFixture = await Bun.file(
    join(packageRoot, "fixtures/wire/v1/nightfire-values.json")
  ).text();
  if (packagedFixture !== canonicalFixture) {
    throw new Error("packaged Cargo fixture differs from the root fixture");
  }

  run(["cargo", "test", "--locked"], packageRoot, {
    CARGO_TARGET_DIR: join(destination, "test-target")
  });
  console.log(
    `Cargo package proof passed: unpacked nightfire ${manifest.version} tests consume the root fixture`
  );
} finally {
  await rm(destination, { recursive: true, force: true });
}
