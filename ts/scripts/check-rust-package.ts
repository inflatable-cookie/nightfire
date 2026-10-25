import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  captureRustTool,
  prepareDisposableWorkspace,
  runRustTool,
} from "./rust-route";

function run(command: string[], cwd: string): void {
  const child = Bun.spawnSync(command, {
    cwd,
    env: { ...process.env },
    stdout: "inherit",
    stderr: "inherit",
  });
  if (child.exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed`);
  }
}

const root = process.cwd();
const manifest = await Bun.file(join(root, "package.json")).json();
const workspaceManifest = join(root, "Cargo.toml");
const destination = await mkdtemp(join(tmpdir(), "nightfire-crate-"));

try {
  // Oxide owns where a Cargo command writes, so the archive location comes from
  // Cargo's own metadata rather than a target directory this proof picks.
  const metadata = JSON.parse(
    captureRustTool(workspaceManifest, [
      "cargo",
      "metadata",
      "--no-deps",
      "--format-version",
      "1",
    ])
  ) as { target_directory: string };

  runRustTool(workspaceManifest, ["cargo", "package", "-p", "nightfire", "--locked"]);

  const crate = join(
    metadata.target_directory,
    "package",
    `nightfire-${manifest.version}.crate`
  );
  if (!(await Bun.file(crate).exists())) {
    throw new Error(`no crate archive at ${crate}`);
  }
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

  // The unpacked crate is its own workspace, so it is bound to its own manifest
  // and prepared for Oxide's storage rules before its tests run.
  await prepareDisposableWorkspace(packageRoot);
  runRustTool(join(packageRoot, "Cargo.toml"), ["cargo", "test", "--locked"], packageRoot);
  console.log(
    `Cargo package proof passed: unpacked nightfire ${manifest.version} tests consume the root fixture`
  );
} finally {
  await rm(destination, { recursive: true, force: true });
}
