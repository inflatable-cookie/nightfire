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
  "smol-toml",
];

const manifest = await Bun.file("package.json").json();
for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
  for (const name of Object.keys(manifest[section] ?? {})) {
    if (forbidden.includes(name)) throw new Error(`forbidden ${section} dependency: ${name}`);
  }
}

const lockfile = await Bun.file("bun.lock").text();
for (const name of forbidden) {
  if (lockfile.includes(`${name}@`)) {
    throw new Error(`forbidden transitive dependency in bun.lock: ${name}`);
  }
}

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(ts|svelte|rs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const allSourceFiles = await sourceFiles("ts/src");
const sourceSet = new Set(allSourceFiles.map(normalize));

for (const path of allSourceFiles) {
  const source = await Bun.file(path).text();
  for (const name of forbidden) {
    const dependencyPattern = new RegExp(`(?:from\\s+|import\\s*\\()(["'])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    if (dependencyPattern.test(source)) throw new Error(`forbidden source import ${name}: ${path}`);
  }
  if (/acow:|acow\.|acowtancy|froyo|bovine|dairy|summary\.(?:book|circles|pie|steps|diagram|slideshow|image_slider)/i.test(source)) {
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

for (const path of ["ts/src/editor-registry.ts", "ts/src/render-registry.ts"]) {
  const firstLine = (await Bun.file(path).text()).split("\n", 1)[0];
  if (!firstLine.startsWith("import type ") || !firstLine.includes('from "svelte"')) {
    throw new Error(`registry Svelte import must stay type-only: ${path}`);
  }
}

type ImportRef = { specifier: string; typeOnly: boolean };

function namedBindingsAreTypeOnly(clause: string): boolean {
  const named = clause.match(/^\{([^}]+)\}$/);
  if (!named) return false;
  const parts = named[1]!.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((part) => /^type\s/.test(part));
}

function importedRefs(path: string, source: string): ImportRef[] {
  const scripts = path.endsWith(".svelte")
    ? Array.from(source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g), (match) => match[1]!)
    : [source];
  return scripts.flatMap((script) => {
    const refs: ImportRef[] = [];
    for (const match of script.matchAll(
      /(?:import|export)(\s+type)?\s+([^"'`;]*?)\s+from\s+["']([^"']+)["']/g,
    )) {
      const clause = match[2]!.trim();
      refs.push({
        specifier: match[3]!,
        typeOnly: Boolean(match[1]) || namedBindingsAreTypeOnly(clause),
      });
    }
    for (const match of script.matchAll(/^[ \t]*(?:import|export)\s+["']([^"']+)["']/gm)) {
      refs.push({ specifier: match[1]!, typeOnly: false });
    }
    for (const match of script.matchAll(/import\(\s*["']([^"']+)["']/g)) {
      refs.push({ specifier: match[1]!, typeOnly: false });
    }
    return refs;
  });
}

function resolveSourceImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = normalize(join(dirname(importer), specifier)).replace(/\.js$/, "");
  for (const candidate of [base, `${base}.ts`, `${base}.svelte`, join(base, "index.ts")]) {
    if (sourceSet.has(candidate)) return candidate;
  }
  throw new Error(`unresolved relative source import ${specifier}: ${importer}`);
}

async function sourceGraph(entrypoint: string): Promise<string[]> {
  const pending = [normalize(entrypoint)];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const path = pending.pop()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const source = await Bun.file(path).text();
    for (const ref of importedRefs(path, source)) {
      const dependency = resolveSourceImport(path, ref.specifier);
      if (dependency) pending.push(dependency);
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
    const path = pending.pop()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const source = await Bun.file(path).text();
    for (const ref of importedRefs(path, source)) {
      if (ref.typeOnly) continue;
      if (isPoodleSpecifier(ref.specifier)) {
        throw new Error(
          `renderer graph runtime import of Poodle: ${path} → ${ref.specifier} (from ${entrypoint})`,
        );
      }
      const dependency = resolveSourceImport(path, ref.specifier);
      if (dependency) pending.push(dependency);
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
    metafile: true,
  });
  if (!result.success) throw new Error(result.logs.map(String).join("\n"));
  return {
    text: await result.outputs[0]!.text(),
    size: result.outputs[0]!.size,
    inputs: Object.keys(result.metafile.inputs).sort(),
  };
}

for (const entrypoint of ["ts/src/core.ts", "ts/src/validation.ts"]) {
  for (const path of await sourceGraph(entrypoint)) {
    const source = await Bun.file(path).text();
    if (/import\s+(?!type\b)[^;]*from\s+["']svelte(?:\/|["'])/.test(source)) {
      throw new Error(`${entrypoint} has a Svelte runtime edge through ${path}`);
    }
  }
}

const rendererGraph = await sourceGraph("ts/src/renderer.ts");
for (const path of rendererGraph) {
  if (/(?:^|\/)(?:editor-registrations|render-registrations)\.ts$|\/editor\/|\/(?:markup|download-card|rich-text)\/editor\.ts$/.test(path)) {
    throw new Error(`renderer source graph contains editor/registration module: ${path}`);
  }
}

// The render catalog is the entry consumers import to get every core renderer.
// It must reach renderer modules only; a rich-text renderer that pulled its
// editor would drag TipTap into every render-only consumer.
const renderCatalogGraph = (await sourceGraph("ts/src/render-registrations.ts"))
  .filter((path) => !path.endsWith("render-registrations.ts"));
for (const path of renderCatalogGraph) {
  if (/(?:^|\/)editor-registrations\.ts$|\/editor\/|\/(?:markup|download-card|rich-text)\/editor\.ts$/.test(path)) {
    throw new Error(`render catalog source graph contains editor module: ${path}`);
  }
}

// A renderer resolves media references, so no TypeScript module in the renderer
// or render-catalog graph may take a Svelte runtime edge: type-only imports are
// fine, a context or a reactive primitive is not.
for (const path of [...rendererGraph, ...renderCatalogGraph]) {
  if (!path.endsWith(".ts")) continue;
  const source = await Bun.file(path).text();
  if (/import\s+(?!type\b)[^;]*from\s+["']svelte(?:\/|["'])/.test(source)) {
    throw new Error(`render-side graph has a Svelte runtime edge through ${path}`);
  }
}

// Learner-facing renderer graphs must not load Poodle at runtime. Type-only
// imports pass; a reachable `import` of `@inflatable-cookie/poodle-svelte` fails.
const rendererEntrypoints = [
  "ts/src/renderer.ts",
  "ts/src/render-registrations.ts",
  "ts/src/core-blocks.ts",
  "ts/src/markup/render.ts",
  "ts/src/layout/render.ts",
  "ts/src/rich-text/render.ts",
  "ts/src/download-card/render.ts",
  "ts/src/image/render.ts",
  "ts/src/video/render.ts",
];
for (const entrypoint of rendererEntrypoints) {
  await assertRendererGraphPoodleFree(entrypoint);
}

const core = await bundle("ts/src/core.ts");
const validation = await bundle("ts/src/validator-registry.ts");
const renderer = await bundle("ts/src/NightfireRenderer.svelte", true);
const renderCatalog = await bundle("ts/src/render-registrations.ts", true);
for (const marker of ["editor-registrations", "download-card/editor", "markup/editor", "rich-text/editor", "registerBlockEditor(", POODLE]) {
  if (renderer.text.includes(marker)) {
    throw new Error(`renderer bundle contains editor/registration marker: ${marker}`);
  }
}
if (renderCatalog.text.includes(POODLE)) {
  throw new Error(`render catalog bundle contains a Poodle import`);
}
for (const input of renderer.inputs) {
  if (/(?:^|\/)(?:editor-registrations|render-registrations)\.ts$|\/editor\/|\/(?:markup|download-card|rich-text)\/editor\.ts$/.test(input)) {
    throw new Error(`renderer bundle contains editor/registration input: ${input}`);
  }
}

console.log(
  `boundary proof passed: forbidden graph absent; core ${core.size} bytes; validation ${validation.size} bytes; renderer ${renderer.size} bytes/${renderer.inputs.length} inputs and editor-free; render catalog Poodle-free`,
);
