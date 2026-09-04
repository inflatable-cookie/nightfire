import ts from "typescript";
import { compile, compileModule, preprocess } from "svelte/compiler";

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
