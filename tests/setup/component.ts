import { JSDOM } from "jsdom";
import { afterEach } from "bun:test";
import { registerSveltePlugin } from "./svelte-plugin";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://nightfire.test/",
});

Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
if (process.env.NIGHTFIRE_RUNTIME === "tauri") {
  Object.defineProperty(dom.window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
}

for (const name of Object.getOwnPropertyNames(dom.window)) {
  if (name in globalThis) continue;
  const descriptor = Object.getOwnPropertyDescriptor(dom.window, name);
  if (!descriptor) continue;
  try {
    Object.defineProperty(globalThis, name, descriptor);
  } catch {
    // Some jsdom globals are intentionally non-configurable in the host.
  }
}

for (const name of [
  "Node",
  "Text",
  "Comment",
  "Element",
  "HTMLElement",
  "SVGElement",
  "Document",
  "DocumentFragment",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "Event",
  "KeyboardEvent",
  "MouseEvent",
  "MutationObserver",
  "CustomEvent",
]) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: dom.window[name as keyof Window],
  });
}

if (typeof dom.window.matchMedia !== "function") {
  Object.defineProperty(dom.window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }),
  });
}

registerSveltePlugin("client");

afterEach(async () => {
  const { cleanup } = await import("../render");
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 25));
});
