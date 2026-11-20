import { existsSync } from "node:fs";

// The export map is the package's whole public surface: a subpath that no
// consumer calls is dead weight the next consumer has to sweep. Keep this list
// equal to `package.json` `exports`, and runtime-import every subpath that is
// plain TypeScript so a broken target fails here rather than at install time.
const expected = [
  ".",
  "./block-versions",
  "./core",
  "./editor",
  "./editor-registrations",
  "./editor-registry",
  "./markdown",
  "./media-source",
  "./package.json",
  "./render-registrations",
  "./render-registry",
  "./renderer",
  "./rich-text",
  "./strategies",
  "./styles.css",
  "./types",
  "./utils",
  "./validation",
  "./validator-registry"
];

// Subpaths whose target is TypeScript with no `.svelte` import, so plain `bun`
// can load them without the Svelte plugin.
const pureTypeScript = [
  ".",
  "./block-versions",
  "./core",
  "./editor-registry",
  "./media-source",
  "./render-registry",
  "./rich-text",
  "./strategies",
  "./types",
  "./utils",
  "./validation",
  "./validator-registry"
];

const manifest = await Bun.file("package.json").json();
const actual = Object.keys(manifest.exports).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `export map mismatch\nexpected ${JSON.stringify(expected)}\nactual   ${JSON.stringify(actual)}`
  );
}

for (const [subpath, target] of Object.entries<string>(manifest.exports)) {
  if (!existsSync(target)) {
    throw new Error(`missing export target ${subpath}: ${target}`);
  }
}

for (const subpath of pureTypeScript) {
  const loaded: unknown = await import(`@inflatable-cookie/nightfire${subpath.slice(1)}`);
  if (loaded === null || typeof loaded !== "object") {
    throw new Error(`export target did not load as a module: ${subpath}`);
  }
}

console.log(
  `export proof passed: ${actual.length} explicit subpaths resolve, ${pureTypeScript.length} runtime-imported`
);
