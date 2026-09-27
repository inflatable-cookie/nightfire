import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";
import { JSDOM } from "jsdom";
import { registerSveltePlugin } from "../tests/setup/svelte-plugin";

function run(command: string[], cwd?: string) {
  const child = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (child.exitCode !== 0) {
    throw new Error(
      `${command.join(" ")} failed\n${child.stdout.toString()}\n${child.stderr.toString()}`,
    );
  }
  return child.stdout.toString();
}

const destination = await mkdtemp(join(tmpdir(), "nightfire-renderer-consumer-"));
try {
  const packed = Bun.spawnSync([
    "bun", "pm", "pack", "--ignore-scripts", "--quiet", "--destination", destination,
  ]);
  if (packed.exitCode !== 0) throw new Error(packed.stderr.toString());
  const filename = packed.stdout.toString().trim().split("\n").at(-1)!;
  const tarball = isAbsolute(filename) ? filename : join(destination, filename);

  const consumer = join(destination, "app");
  await mkdir(consumer);
  await Bun.write(
    join(consumer, "package.json"),
    `${JSON.stringify({
      name: "nightfire-renderer-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@inflatable-cookie/nightfire": tarball,
        svelte: "5.56.8",
      },
    }, null, 2)}\n`,
  );
  run(["bun", "install"], consumer);

  const poodle = join(consumer, "node_modules/@inflatable-cookie/poodle-svelte");
  if (existsSync(poodle)) {
    throw new Error("renderer consumer installed Poodle; it must stay an optional editor peer");
  }

  const pkg = join(consumer, "node_modules/@inflatable-cookie/nightfire");
  const fixture = await Bun.file(join(pkg, "fixtures/wire/v1/nightfire-values.json")).json() as {
    values: Array<{ name: string; value: { blocks: Array<{ type: string }> } }>;
  };
  const corePayloads = fixture.values.find((entry) => entry.name === "core-payloads");
  if (!corePayloads) throw new Error("core-payloads fixture missing from packed package");

  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://nightfire.test/",
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  for (const name of [
    "Node",
    "Text",
    "Comment",
    "Element",
    "HTMLElement",
    "DocumentFragment",
    "HTMLIFrameElement",
  ]) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: (dom.window as unknown as Record<string, unknown>)[name],
    });
  }
  registerSveltePlugin("client");

  const { mount, unmount } = await import(join(consumer, "node_modules/svelte")) as {
    mount: typeof import("svelte").mount;
    unmount: typeof import("svelte").unmount;
  };

  await import(join(pkg, "ts/src/renderer.ts"));
  await import(join(pkg, "ts/src/render-registrations.ts"));
  const { CORE_BLOCK_TYPE_NAMES } = await import(join(pkg, "ts/src/core-blocks.ts")) as {
    CORE_BLOCK_TYPE_NAMES: string[];
  };
  const { default: NightfireRenderer } = await import(join(pkg, "ts/src/NightfireRenderer.svelte"));

  const container = document.createElement("div");
  document.body.append(container);
  const instance = mount(NightfireRenderer, {
    target: container,
    props: { value: corePayloads.value },
  });
  try {
    for (const type of CORE_BLOCK_TYPE_NAMES) {
      const root = container.querySelector(`[data-nightfire-block="${type}"]`);
      if (!root) {
        throw new Error(`renderer consumer did not render ${type}`);
      }
    }
  } finally {
    unmount(instance);
    container.remove();
  }

  console.log(
    `renderer consumer proof passed: Nightfire installed without Poodle; ${CORE_BLOCK_TYPE_NAMES.length} core blocks rendered`,
  );
} finally {
  await rm(destination, { recursive: true, force: true });
}
