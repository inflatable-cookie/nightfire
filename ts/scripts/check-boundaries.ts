import { readdir } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { createSveltePlugin } from "../tests/setup/svelte-plugin";

const forbidden = [
  "@inflatable-cookie/underlay",
  "@sveltejs/kit",
  "vite",
  "bits-ui",
  "lucide-svelte",
  "zod",
  "smol-toml"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const manifest: unknown = await Bun.file("package.json").json();
if (!isRecord(manifest)) {
  throw new Error("package.json must be a JSON object");
}
for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
  const deps = manifest[section];
  for (const name of Object.keys(isRecord(deps) ? deps : {})) {
    if (forbidden.includes(name)) {
      throw new Error(`forbidden ${section} dependency: ${name}`);
    }
  }
}

// The lock is held to the published runtime graph, not to every dev tool's own
// dependencies: a consumer installs `dependencies`, so that closure is the
// boundary a forbidden package must never enter. The manifest scan above
// already refuses a forbidden package declared directly in any section,
// devDependencies included.
const lockRaw: unknown = Bun.JSONC.parse(await Bun.file("bun.lock").text());
const lock = isRecord(lockRaw) ? lockRaw : {};
const lockedPackages = isRecord(lock.packages) ? lock.packages : {};
const workspaces = isRecord(lock.workspaces) ? lock.workspaces : {};
const rootWorkspace = isRecord(workspaces[""]) ? workspaces[""] : {};
const rootDependencies = isRecord(rootWorkspace.dependencies) ? rootWorkspace.dependencies : {};
const runtimePackages = new Set<string>();
const lockPending = Object.keys(rootDependencies);
while (lockPending.length > 0) {
  const name = lockPending.pop();
  if (!name || runtimePackages.has(name)) {
    continue;
  }
  runtimePackages.add(name);
  const entry = lockedPackages[name];
  const meta = Array.isArray(entry) && isRecord(entry[2]) ? entry[2] : {};
  const entryDeps = isRecord(meta.dependencies) ? meta.dependencies : {};
  const entryOptionalDeps = isRecord(meta.optionalDependencies) ? meta.optionalDependencies : {};
  lockPending.push(...Object.keys(entryDeps), ...Object.keys(entryOptionalDeps));
}
for (const name of forbidden) {
  if (runtimePackages.has(name)) {
    throw new Error(`forbidden runtime dependency in bun.lock: ${name}`);
  }
}

// The Rust lock is held to the same boundary. A crate is forbidden when its name
// is an npm forbidden package's unscoped name (`vite`, `zod`, …) or names an
// Underlay or product crate.
const forbiddenCrateNames = new Set(forbidden.map((name) => name.split("/").at(-1) ?? name));
const cargoLock = await Bun.file("Cargo.lock").text();
for (const [, crate] of cargoLock.matchAll(/^name = "([^"]+)"$/gm)) {
  if (!crate) {
    continue;
  }
  if (forbiddenCrateNames.has(crate) || /underlay|acowtancy|froyo|bovine|dairy/i.test(crate)) {
    throw new Error(`forbidden transitive dependency in Cargo.lock: ${crate}`);
  }
}

async function sourceFiles(root: string): Promise<Array<string>> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: Array<string> = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (/\.(ts|svelte|rs)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

const allSourceFiles = await sourceFiles("ts/src");
const sourceSet = new Set(allSourceFiles.map(normalize));

for (const path of allSourceFiles) {
  const source = await Bun.file(path).text();
  for (const name of forbidden) {
    const dependencyPattern = new RegExp(
      `(?:from\\s+|import\\s*\\()(["'])${name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}`
    );
    if (dependencyPattern.test(source)) {
      throw new Error(`forbidden source import ${name}: ${path}`);
    }
  }
  if (
    /acow:|acow\.|acowtancy|froyo|bovine|dairy|summary\.(?:book|circles|pie|steps|diagram|slideshow|image_slider)/i.test(
      source
    )
  ) {
    throw new Error(`product-specific Nightfire source: ${path}`);
  }
}

const rustFiles = (await sourceFiles("rust/nightfire")).filter((path) => path.endsWith(".rs"));
for (const path of ["Cargo.toml", "rust/nightfire/Cargo.toml", ...rustFiles]) {
  const source = await Bun.file(path).text();
  if (/underlay|acowtancy|froyo|bovine|dairy/i.test(source)) {
    throw new Error(`forbidden product or Underlay Rust source: ${path}`);
  }
}

type ImportRef = { specifier: string; typeOnly: boolean };

function namedBindingsAreTypeOnly(clause: string): boolean {
  const named = clause.match(/^\{([^}]+)\}$/);
  const inner = named?.[1];
  if (!inner) {
    return false;
  }
  const parts = inner
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => /^type\s/.test(part));
}

// Blank every comment before imports are read, so an example in a doc comment is
// never taken for an import. The walk tracks string and template literals, so a
// `//` inside a URL is not a comment. Comment characters become spaces, which
// keeps line numbers and the rest of the source as written.
function stripComments(source: string): string {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const char = source.charAt(index);
    const next = source[index + 1];
    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      out += " ".repeat(stop - index);
      index = stop;
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(index, stop).replaceAll(/[^\n]/g, " ");
      index = stop;
    } else if (char === '"' || char === "'" || char === "`") {
      let stop = index + 1;
      while (stop < source.length && source[stop] !== char) {
        stop += source[stop] === "\\" ? 2 : 1;
      }
      out += source.slice(index, stop + 1);
      index = stop + 1;
    } else {
      out += char;
      index += 1;
    }
  }
  return out;
}

function importedRefs(path: string, source: string): Array<ImportRef> {
  const scripts = path.endsWith(".svelte")
    ? Array.from(
        source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),
        (match) => match[1] ?? ""
      )
    : [source];
  return scripts.flatMap((raw) => {
    const script = stripComments(raw);
    const refs: Array<ImportRef> = [];
    for (const match of script.matchAll(
      /(?:import|export)(\s+type)?\s+([^"'`;]*?)\s+from\s+["']([^"']+)["']/g
    )) {
      const clause = match[2]?.trim();
      const specifier = match[3];
      if (!clause || !specifier) {
        continue;
      }
      refs.push({
        specifier,
        typeOnly: Boolean(match[1]) || namedBindingsAreTypeOnly(clause)
      });
    }
    for (const match of script.matchAll(/^[ \t]*(?:import|export)\s+["']([^"']+)["']/gm)) {
      const specifier = match[1];
      if (specifier) {
        refs.push({ specifier, typeOnly: false });
      }
    }
    for (const match of script.matchAll(/import\(\s*["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (specifier) {
        refs.push({ specifier, typeOnly: false });
      }
    }
    return refs;
  });
}

// A Svelte runtime edge is any non-type reference to `svelte` or a `svelte/*`
// subpath, wherever it sits in the file: a top-level `import`, a side-effect
// import or a dynamic `import()`. `import type` and `import { type X }` name
// types only and are erased, so they pass.
function svelteRefs(path: string, source: string): Array<ImportRef> {
  return importedRefs(path, source).filter(
    (ref) => ref.specifier === "svelte" || ref.specifier.startsWith("svelte/")
  );
}

function hasSvelteRuntimeEdge(path: string, source: string): boolean {
  return svelteRefs(path, source).some((ref) => !ref.typeOnly);
}

// The registries describe Svelte component types; they must import Svelte for
// the types alone, on whatever line, and never at runtime.
for (const path of ["ts/src/editor-registry.ts", "ts/src/render-registry.ts"]) {
  const source = await Bun.file(path).text();
  const refs = svelteRefs(path, source);
  if (refs.length === 0) {
    throw new Error(`registry must import Svelte types: ${path}`);
  }
  if (refs.some((ref) => !ref.typeOnly)) {
    throw new Error(`registry Svelte import must stay type-only: ${path}`);
  }
}

function resolveSourceImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const base = normalize(join(dirname(importer), specifier)).replace(/\.js$/, "");
  for (const candidate of [base, `${base}.ts`, `${base}.svelte`, join(base, "index.ts")]) {
    if (sourceSet.has(candidate)) {
      return candidate;
    }
  }
  throw new Error(`unresolved relative source import ${specifier}: ${importer}`);
}

async function sourceGraph(entrypoint: string): Promise<Array<string>> {
  const pending = [normalize(entrypoint)];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const path = pending.pop();
    if (!path || visited.has(path)) {
      continue;
    }
    visited.add(path);
    const source = await Bun.file(path).text();
    for (const ref of importedRefs(path, source)) {
      const dependency = resolveSourceImport(path, ref.specifier);
      if (dependency) {
        pending.push(dependency);
      }
    }
  }
  return [...visited].sort();
}

const POODLE = "@inflatable-cookie/poodle-svelte";

function isPoodleSpecifier(specifier: string): boolean {
  return specifier === POODLE || specifier.startsWith(`${POODLE}/`);
}

async function assertRendererGraphPoodleFree(entrypoint: string): Promise<void> {
  const pending = [normalize(entrypoint)];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const path = pending.pop();
    if (!path || visited.has(path)) {
      continue;
    }
    visited.add(path);
    const source = await Bun.file(path).text();
    for (const ref of importedRefs(path, source)) {
      if (ref.typeOnly) {
        continue;
      }
      if (isPoodleSpecifier(ref.specifier)) {
        throw new Error(
          `renderer graph runtime import of Poodle: ${path} → ${ref.specifier} (from ${entrypoint})`
        );
      }
      const dependency = resolveSourceImport(path, ref.specifier);
      if (dependency) {
        pending.push(dependency);
      }
    }
  }
}

async function bundle(entrypoint: string, svelte = false) {
  const result = await Bun.build({
    entrypoints: [entrypoint],
    target: "browser",
    format: "esm",
    minify: false,
    packages: "external",
    plugins: svelte ? [createSveltePlugin("client")] : [],
    metafile: true
  });
  if (!result.success) {
    throw new Error(result.logs.map(String).join("\n"));
  }
  // metafile is requested above, so its absence means the build did not do what
  // the boundary check needs; fail loudly rather than report no inputs.
  if (!result.metafile) {
    throw new Error(`bundle of ${entrypoint} produced no metafile`);
  }
  const output = result.outputs[0];
  if (!output) {
    throw new Error(`bundle of ${entrypoint} produced no output`);
  }
  return {
    text: await output.text(),
    size: output.size,
    inputs: Object.keys(result.metafile.inputs).sort()
  };
}

// A block editor module is a per-block `editor.ts` (markup, download-card,
// rich-text, image, video, layout, …), the editor registrations catalog, or
// anything under an `editor/` directory. `ts/src/editor.ts` is the public
// editor entry point, not a block editor, and is excluded by name.
const EDITOR_MODULE =
  /(?:^|\/)(?:editor-registrations|render-registrations)\.ts$|\/editor\/|\/[^/\s]+\/editor\.ts\b/;
const PUBLIC_EDITOR_ENTRY = normalize("ts/src/editor.ts");

function isEditorModule(path: string): boolean {
  return normalize(path) !== PUBLIC_EDITOR_ENTRY && EDITOR_MODULE.test(path);
}

// Every block editor module shipped in `ts/src`, derived from the tree so a new
// block's editor is guarded without editing this proof.
const blockEditorModules = allSourceFiles
  .map((path) => normalize(path))
  .filter((path) => isEditorModule(path) && !path.endsWith("editor-registrations.ts"));
if (blockEditorModules.length === 0) {
  throw new Error(
    "boundary proof found no block editor module to guard; the tree is not in the expected shape"
  );
}

for (const entrypoint of ["ts/src/core.ts", "ts/src/validation.ts", "ts/src/index.ts"]) {
  for (const path of await sourceGraph(entrypoint)) {
    const source = await Bun.file(path).text();
    if (hasSvelteRuntimeEdge(path, source)) {
      throw new Error(`${entrypoint} has a Svelte runtime edge through ${path}`);
    }
  }
}

// The root export `.` is the Svelte-free barrel. Strategies carry the Svelte
// context and store runtime, so they stay on their own `./strategies` subpath.
if ((await sourceGraph("ts/src/index.ts")).includes(normalize("ts/src/strategies.ts"))) {
  throw new Error("root export . reaches ./strategies; keep strategies on their own subpath");
}

const rendererGraph = await sourceGraph("ts/src/renderer.ts");
for (const path of rendererGraph) {
  if (isEditorModule(path)) {
    throw new Error(`renderer source graph contains editor/registration module: ${path}`);
  }
}

// The render catalog is the entry consumers import to get every core renderer.
// It must reach renderer modules only; a rich-text renderer that pulled its
// editor would drag TipTap into every render-only consumer.
const renderCatalogGraph = (await sourceGraph("ts/src/render-registrations.ts")).filter(
  (path) => !path.endsWith("render-registrations.ts")
);
for (const path of renderCatalogGraph) {
  if (isEditorModule(path)) {
    throw new Error(`render catalog source graph contains editor module: ${path}`);
  }
}

// A renderer resolves media references, so no TypeScript module in the renderer
// or render-catalog graph may take a Svelte runtime edge: type-only imports are
// fine, a context or a reactive primitive is not.
for (const path of [...rendererGraph, ...renderCatalogGraph]) {
  if (!path.endsWith(".ts")) {
    continue;
  }
  const source = await Bun.file(path).text();
  if (hasSvelteRuntimeEdge(path, source)) {
    throw new Error(`render-side graph has a Svelte runtime edge through ${path}`);
  }
}

// Learner-facing renderer graphs must not load Poodle at runtime. Type-only
// imports pass; a reachable `import` of `@inflatable-cookie/poodle-svelte` fails.
// Every block's `render.ts` is derived from the tree, so a new block's renderer is
// guarded without editing this proof.
const blockRenderModules = allSourceFiles
  .map((path) => normalize(path))
  .filter((path) => /^ts\/src\/(?:[^/]+\/)+render\.ts$/.test(path))
  .sort();
if (blockRenderModules.length === 0) {
  throw new Error(
    "boundary proof found no block render module to guard; the tree is not in the expected shape"
  );
}
const rendererEntrypoints = [
  "ts/src/renderer.ts",
  "ts/src/render-registrations.ts",
  "ts/src/rich-text.ts",
  "ts/src/core-blocks.ts",
  ...blockRenderModules
];
for (const entrypoint of rendererEntrypoints) {
  await assertRendererGraphPoodleFree(entrypoint);
}

const core = await bundle("ts/src/core.ts");
const validation = await bundle("ts/src/validation.ts");
const renderer = await bundle("ts/src/renderer.ts", true);
const renderCatalog = await bundle("ts/src/render-registrations.ts", true);
// Each shipped block editor is a marker, so the bundle proof grows with the
// tree instead of naming three blocks by hand.
const editorMarkers = blockEditorModules.map((path) =>
  path.replace(/^ts\/src\//, "").replace(/\.ts$/, "")
);
for (const marker of ["editor-registrations", ...editorMarkers, "registerBlockEditor(", POODLE]) {
  if (renderer.text.includes(marker)) {
    throw new Error(`renderer bundle contains editor/registration marker: ${marker}`);
  }
}
if (renderCatalog.text.includes(POODLE)) {
  throw new Error(`render catalog bundle contains a Poodle import`);
}
for (const input of renderer.inputs) {
  if (isEditorModule(input)) {
    throw new Error(`renderer bundle contains editor/registration input: ${input}`);
  }
}

console.log(
  `boundary proof passed: forbidden graph absent; core ${core.size} bytes; validation ${validation.size} bytes; renderer ${renderer.size} bytes/${renderer.inputs.length} inputs and editor-free; render catalog Poodle-free`
);
