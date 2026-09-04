import { existsSync } from "node:fs";

const expected = [
  ".",
  "./block-editor",
  "./block-ids",
  "./block-registration",
  "./block-versions",
  "./core",
  "./editor",
  "./editor-registry",
  "./markdown",
  "./media",
  "./media-locator",
  "./package.json",
  "./render-registry",
  "./renderer",
  "./strategies",
  "./styles.css",
  "./types",
  "./utils",
  "./validation",
  "./validator-registry",
];

const manifest = await Bun.file("package.json").json();
const actual = Object.keys(manifest.exports).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`export map mismatch\nexpected ${JSON.stringify(expected)}\nactual   ${JSON.stringify(actual)}`);
}

for (const [subpath, target] of Object.entries<string>(manifest.exports)) {
  if (!existsSync(target)) throw new Error(`missing export target ${subpath}: ${target}`);
}

await import("@inflatable-cookie/nightfire/core");
await import("@inflatable-cookie/nightfire/validation");
await import("@inflatable-cookie/nightfire/editor-registry");
await import("@inflatable-cookie/nightfire/render-registry");

console.log(`export proof passed: ${actual.length} explicit subpaths resolve`);
