import { readdir } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import ts from "typescript";
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
    else if (/\.(ts|svelte)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const allSourceFiles = await sourceFiles("src");
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

for (const path of ["src/editor-registry.ts", "src/render-registry.ts"]) {
  const firstLine = (await Bun.file(path).text()).split("\n", 1)[0];
  if (!firstLine.startsWith("import type ") || !firstLine.includes('from "svelte"')) {
    throw new Error(`registry Svelte import must stay type-only: ${path}`);
  }
}

function importedSpecifiers(path: string, source: string): string[] {
  const scripts = path.endsWith(".svelte")
    ? Array.from(source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g), (match) => match[1]!)
    : [source];
  return scripts.flatMap((script) =>
    ts.preProcessFile(script).importedFiles.map((file) => file.fileName),
  );
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
    for (const specifier of importedSpecifiers(path, source)) {
      const dependency = resolveSourceImport(path, specifier);
      if (dependency) pending.push(dependency);
    }
  }
  return [...visited].sort();
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

for (const entrypoint of ["src/core.ts", "src/validation.ts"]) {
  for (const path of await sourceGraph(entrypoint)) {
    const source = await Bun.file(path).text();
    if (/import\s+(?!type\b)[^;]*from\s+["']svelte(?:\/|["'])/.test(source)) {
      throw new Error(`${entrypoint} has a Svelte runtime edge through ${path}`);
    }
  }
}

const rendererGraph = await sourceGraph("src/renderer.ts");
for (const path of rendererGraph) {
  if (/(?:^|\/)(?:editor-registrations|render-registrations)\.ts$|\/editor\/|\/(?:markup|media)\/editor\.ts$/.test(path)) {
    throw new Error(`renderer source graph contains editor/registration module: ${path}`);
  }
}

const core = await bundle("src/core.ts");
const validation = await bundle("src/validator-registry.ts");
const renderer = await bundle("src/NightfireRenderer.svelte", true);
for (const marker of ["editor-registrations", "media/editor", "markup/editor", "registerBlockEditor("]) {
  if (renderer.text.includes(marker)) {
    throw new Error(`renderer bundle contains editor/registration marker: ${marker}`);
  }
}
for (const input of renderer.inputs) {
  if (/(?:^|\/)(?:editor-registrations|render-registrations)\.ts$|\/editor\/|\/(?:markup|media)\/editor\.ts$/.test(input)) {
    throw new Error(`renderer bundle contains editor/registration input: ${input}`);
  }
}

console.log(
  `boundary proof passed: forbidden graph absent; core ${core.size} bytes; validation ${validation.size} bytes; renderer ${renderer.size} bytes/${renderer.inputs.length} inputs and editor-free`,
);
