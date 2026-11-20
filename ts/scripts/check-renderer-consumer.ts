import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { JSDOM } from "jsdom";
import type { Component, mount as mountSvelte, unmount as unmountSvelte } from "svelte";
import { registerSveltePlugin } from "../tests/setup/svelte-plugin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSvelteRuntime(
  value: unknown
): value is { mount: typeof mountSvelte; unmount: typeof unmountSvelte } {
  return (
    isRecord(value) && typeof value.mount === "function" && typeof value.unmount === "function"
  );
}

function isRendererComponent(value: unknown): value is Component<{ value: unknown }> {
  return typeof value === "function";
}

function run(command: Array<string>, cwd?: string) {
  const child = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe"
  });
  if (child.exitCode !== 0) {
    throw new Error(
      `${command.join(" ")} failed\n${child.stdout.toString()}\n${child.stderr.toString()}`
    );
  }
  return child.stdout.toString();
}

// The consumer pins the same Svelte this repository builds against, so the proof
// follows a Svelte bump instead of a copy of its version here.
const repoRoot = resolve(import.meta.dir, "../..");
const repoManifest: unknown = await Bun.file(join(repoRoot, "package.json")).json();
const svelteVersion =
  isRecord(repoManifest) && isRecord(repoManifest.devDependencies)
    ? repoManifest.devDependencies.svelte
    : null;
if (typeof svelteVersion !== "string" || svelteVersion.length === 0) {
  throw new Error("package.json must pin devDependencies.svelte for the renderer consumer proof");
}

const destination = await mkdtemp(join(tmpdir(), "nightfire-renderer-consumer-"));
try {
  const packed = Bun.spawnSync([
    "bun",
    "pm",
    "pack",
    "--ignore-scripts",
    "--quiet",
    "--destination",
    destination
  ]);
  if (packed.exitCode !== 0) {
    throw new Error(packed.stderr.toString());
  }
  const filename = packed.stdout.toString().trim().split("\n").at(-1) ?? "";
  const tarball = isAbsolute(filename) ? filename : join(destination, filename);

  const consumer = join(destination, "app");
  await mkdir(consumer);
  await Bun.write(
    join(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "nightfire-renderer-consumer",
        private: true,
        type: "module",
        dependencies: {
          "@inflatable-cookie/nightfire": tarball,
          svelte: svelteVersion
        }
      },
      null,
      2
    )}\n`
  );
  run(["bun", "install"], consumer);

  const poodle = join(consumer, "node_modules/@inflatable-cookie/poodle-svelte");
  if (existsSync(poodle)) {
    throw new Error("renderer consumer installed Poodle; it must stay an optional editor peer");
  }

  const pkg = join(consumer, "node_modules/@inflatable-cookie/nightfire");
  const fixtureRaw: unknown = await Bun.file(
    join(pkg, "fixtures/wire/v1/nightfire-values.json")
  ).json();
  const fixtureValues: Array<unknown> =
    isRecord(fixtureRaw) && Array.isArray(fixtureRaw.values) ? fixtureRaw.values : [];
  const corePayloads = fixtureValues.find(
    (entry): entry is { name: string; value: unknown } =>
      isRecord(entry) && entry.name === "core-payloads"
  );
  if (!corePayloads) {
    throw new Error("core-payloads fixture missing from packed package");
  }

  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://nightfire.test/"
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator
  });
  const domWindow: unknown = dom.window;
  for (const name of [
    "Node",
    "Text",
    "Comment",
    "Element",
    "HTMLElement",
    "DocumentFragment",
    "HTMLIFrameElement"
  ]) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: isRecord(domWindow) ? domWindow[name] : undefined
    });
  }
  registerSveltePlugin("client");

  const svelteMod: unknown = await import(join(consumer, "node_modules/svelte"));
  if (!isSvelteRuntime(svelteMod)) {
    throw new Error("consumer svelte module did not export mount/unmount");
  }
  const { mount, unmount } = svelteMod;

  // The public entries resolve through the installed package's export map, as a
  // consumer's own import would.
  await import(Bun.resolveSync("@inflatable-cookie/nightfire/renderer", consumer));
  await import(Bun.resolveSync("@inflatable-cookie/nightfire/render-registrations", consumer));
  const coreBlocksMod: unknown = await import(join(pkg, "ts/src/core-blocks.ts"));
  const rawBlockNames: Array<unknown> =
    isRecord(coreBlocksMod) && Array.isArray(coreBlocksMod.CORE_BLOCK_TYPE_NAMES)
      ? coreBlocksMod.CORE_BLOCK_TYPE_NAMES
      : [];
  const CORE_BLOCK_TYPE_NAMES = rawBlockNames.filter(
    (entry): entry is string => typeof entry === "string"
  );
  const rendererMod: unknown = await import(join(pkg, "ts/src/NightfireRenderer.svelte"));
  const NightfireRenderer = isRecord(rendererMod) ? rendererMod.default : null;
  if (!isRendererComponent(NightfireRenderer)) {
    throw new Error("NightfireRenderer default export is not a Svelte component");
  }

  const container = document.createElement("div");
  document.body.append(container);
  const instance = mount(NightfireRenderer, {
    target: container,
    props: { value: corePayloads.value }
  });
  try {
    for (const type of CORE_BLOCK_TYPE_NAMES) {
      const root = container.querySelector(`[data-nightfire-block="${type}"]`);
      if (!root) {
        throw new Error(`renderer consumer did not render ${type}`);
      }
    }
  } finally {
    await unmount(instance);
    container.remove();
  }

  // A consumer must reach the rich-text surface from the packed package alone,
  // register its own schema-scoped inline node, and render it. This runs in the
  // consumer's own module scope so the package export map and dependency graph,
  // not a repository-relative path, are what resolve.
  const probe = join(consumer, "rich-text-probe.ts");
  const probeDocument = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "The value " },
          { type: "math_inline", attrs: { latex: "x^2" } },
          { type: "text", text: " is small." }
        ]
      }
    ]
  };
  await Bun.write(
    probe,
    `import {
  registerRichTextInlineNodeRenderer,
  renderRichTextHtml,
} from "@inflatable-cookie/nightfire/rich-text";

const probeDocument = ${JSON.stringify(probeDocument)};

registerRichTextInlineNodeRenderer("consumer.maths", "math_inline", ({ node, escapeText }) => {
  const latex = String(node.attrs.latex ?? "");
  return '<span class="math-inline" data-latex="' + escapeText(latex) + '">' + escapeText(latex) + "</span>";
});

const html = renderRichTextHtml(probeDocument, { schema: "consumer.maths" });
const other = renderRichTextHtml(probeDocument, { schema: "consumer.other" });
process.stdout.write(JSON.stringify({ html, other }));
`
  );
  const probeRun = Bun.spawnSync(["bun", probe], { cwd: consumer });
  if (probeRun.exitCode !== 0) {
    throw new Error(
      `rich-text consumer probe failed\n${probeRun.stdout.toString()}\n${probeRun.stderr.toString()}`
    );
  }
  const rendered: unknown = JSON.parse(probeRun.stdout.toString());
  if (
    !isRecord(rendered) ||
    typeof rendered.html !== "string" ||
    typeof rendered.other !== "string"
  ) {
    throw new Error("rich-text consumer probe did not return { html, other } strings");
  }
  const expected =
    '<p>The value <span class="math-inline" data-latex="x^2">x^2</span> is small.</p>';
  if (rendered.html !== expected) {
    throw new Error(
      `rich-text consumer rendering mismatch\nexpected ${expected}\nactual   ${rendered.html}`
    );
  }
  if (!rendered.other.includes('data-nightfire-inline-fallback="unregistered"')) {
    throw new Error("a registration leaked into another schema or the fallback is missing");
  }

  console.log(
    `renderer consumer proof passed: Nightfire installed without Poodle; ${CORE_BLOCK_TYPE_NAMES.length} core blocks rendered; schema-scoped maths rendered through the public rich-text path`
  );
} finally {
  await rm(destination, { recursive: true, force: true });
}
