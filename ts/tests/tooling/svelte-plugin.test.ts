import { describe, expect, it } from "../vitest";
import { join } from "node:path";
import ts from "typescript";
import { assertLoaderToolchain } from "../setup/svelte-plugin";

// The shared Svelte loader must compile with the toolchain this package pins.
// Bun resolves a bare specifier from its global install cache when node_modules
// is missing, and the cached TypeScript 7 root export is version metadata only;
// that reached the boundary proof as `undefined is not an object (evaluating
// 'ts.ModuleKind.ESNext')` at NightfireRenderer.svelte:0. These tests bound the
// guard that now refuses such a toolchain by name.

const checkoutRoot = join(import.meta.dir, "../../..");

function installed(specifier: string): string {
  const [name] = specifier.split("/");
  return join(checkoutRoot, "node_modules", name!, "lib", "index.js");
}

describe("shared Svelte loader toolchain", () => {
  it("accepts the TypeScript this package pins", () => {
    expect(() => assertLoaderToolchain(ts)).not.toThrow();
  });

  it("names a dependency that resolves outside the checkout", () => {
    const report = () =>
      assertLoaderToolchain(ts, (specifier) =>
        specifier === "svelte/compiler"
          ? join(checkoutRoot, "..", "svelte", "compiler.js")
          : installed(specifier),
      );
    expect(report).toThrow("svelte/compiler resolved outside this checkout");
    expect(report).toThrow("effigy bootstrap:deps");
  });

  it("refuses a version-only typescript root export", () => {
    expect(() =>
      assertLoaderToolchain({ version: "7.0.2", versionMajorMinor: [7, 0] }, installed),
    ).toThrow("no compiler API");
  });
});
