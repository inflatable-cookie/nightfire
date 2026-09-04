const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error("usage: bun scripts/run-test-files.ts <test-dir-or-file> [...]");
  process.exit(2);
}

const component = process.env.NIGHTFIRE_COMPONENT_TESTS === "1";
const glob = new Bun.Glob("**/*.test.ts");
const files: string[] = [];

for (const root of roots) {
  const file = Bun.file(root);
  if (await file.exists()) {
    files.push(root);
    continue;
  }
  for await (const path of glob.scan({ cwd: root, onlyFiles: true })) {
    files.push(`${root}/${path}`);
  }
}

files.sort();
for (const file of files) {
  const args = ["bun"];
  if (component) args.push("--conditions=browser");
  args.push("test");
  if (component) args.push("--preload", "./tests/setup/component.ts");
  args.push(file);
  const child = Bun.spawnSync(args, { stdout: "inherit", stderr: "inherit" });
  if (child.exitCode !== 0) process.exit(child.exitCode);
}
