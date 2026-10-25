import { join, sep } from "node:path";
import ts from "typescript";
import { compile, compileModule, preprocess } from "svelte/compiler";

const checkoutRoot = join(import.meta.dir, "../../..");
const installedRoot = join(checkoutRoot, "node_modules") + sep;

/**
 * The loader compiles for the component tests, `check-boundaries.ts` and
 * `check-renderer-consumer.ts`, so it must use the toolchain this package pins.
 * Bun falls back to its global install cache when `node_modules` is missing, and
 * the cached TypeScript 7 root export is version metadata only, which reached
 * the boundary proof as `undefined is not an object (evaluating
 * 'ts.ModuleKind.ESNext')` at NightfireRenderer.svelte:0. Refuse that toolchain
 * by name instead of failing inside a component.
 */
export function assertLoaderToolchain(
  typescript: unknown,
  resolve: (specifier: string) => string = (specifier) =>
    Bun.resolveSync(specifier, checkoutRoot),
): void {
  for (const specifier of ["typescript", "svelte/compiler"]) {
    const resolved = resolve(specifier);
    if (resolved.startsWith(installedRoot)) continue;
    throw new Error(
      `shared Svelte loader: ${specifier} resolved outside this checkout to ${resolved}; run \`effigy bootstrap:deps\` so the loader uses the pinned toolchain`,
    );
  }
  const compiler = typescript as { transpileModule?: unknown; ModuleKind?: { ESNext?: unknown } } | null;
  if (typeof compiler?.transpileModule !== "function" || compiler.ModuleKind?.ESNext === undefined) {
    throw new Error(
      "shared Svelte loader: the resolved typescript has no compiler API (transpileModule, ModuleKind); run `effigy bootstrap:deps` so the loader uses the pinned TypeScript",
    );
  }
}

assertLoaderToolchain(ts);

export function createSveltePlugin(generate: "client" | "server" = "client") {
  return {
    name: `nightfire-svelte-${generate}`,
    setup(builder) {
      builder.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async ({ path }) => {
        const source = await Bun.file(path).text();
        const code = path.endsWith(".ts")
          ? ts.transpileModule(source, {
              compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
                verbatimModuleSyntax: true,
              },
              fileName: path,
            }).outputText
          : source;
        const compiled = compileModule(code, { filename: path, generate, dev: true });
        return { contents: compiled.js.code, loader: "js" };
      });
      builder.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
        const source = await Bun.file(path).text();
        const processed = await preprocess(source, {
          script({ attributes, content }) {
            if (attributes.lang !== "ts") return;
            return {
              code: ts.transpileModule(content, {
                compilerOptions: {
                  module: ts.ModuleKind.ESNext,
                  target: ts.ScriptTarget.ES2022,
                  verbatimModuleSyntax: true,
                },
                fileName: path,
              }).outputText,
            };
          },
        });
        const compiled = compile(processed.code, {
          filename: path,
          generate,
          dev: true,
          css: "injected",
        });
        return { contents: compiled.js.code, loader: "js" };
      });
    },
  } satisfies Bun.BunPlugin;
}

export function registerSveltePlugin(generate: "client" | "server" = "client"): void {
  Bun.plugin(createSveltePlugin(generate));
}
