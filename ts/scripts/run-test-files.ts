import { existsSync, statSync } from "node:fs";

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error("usage: bun ts/scripts/run-test-files.ts <test-dir-or-file> [...]");
  process.exit(2);
}

const component = process.env.NIGHTFIRE_COMPONENT_TESTS === "1";
const glob = new Bun.Glob("**/*.test.ts");
const files: Array<string> = [];
const failures: Array<string> = [];

// A selector that names a missing directory, or a directory with no test file,
// is a broken suite, not a quiet pass: an empty run would report success for
// tests that never happened.
for (const root of roots) {
  if (!existsSync(root)) {
    failures.push(`missing test path: ${root}`);
    continue;
  }
  if (statSync(root).isFile()) {
    files.push(root);
    continue;
  }
  const matched: Array<string> = [];
  for await (const path of glob.scan({ cwd: root, onlyFiles: true })) {
    matched.push(`${root}/${path}`);
  }
  if (matched.length === 0) {
    failures.push(`no *.test.ts files under ${root}`);
    continue;
  }
  files.push(...matched);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`run-test-files: ${failure}`);
  }
  process.exit(1);
}

files.sort();
for (const file of files) {
  const args = ["bun"];
  if (component) {
    args.push("--conditions=browser");
  }
  args.push("test");
  if (component) {
    args.push("--timeout=30000");
  }
  if (component) {
    args.push("--preload", "./ts/tests/setup/component.ts");
  }
  args.push(file);
  const child = Bun.spawnSync(args, { stdout: "inherit", stderr: "inherit" });
  if (child.exitCode !== 0) {
    process.exit(child.exitCode ?? 1);
  }
}
