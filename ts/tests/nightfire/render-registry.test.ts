import { afterEach, describe, expect, it } from "bun:test";
import { CORE_BLOCK_TYPES, CORE_BLOCK_TYPE_NAMES } from "../../src/core-blocks";
import {
  clearBlockRenderers,
  getBlockRenderer,
  registerBlockRenderer,
  unregisterBlockRenderer
} from "../../src/render-registry";

class A {}
class B {}

describe("nightfire/render-registry", () => {
  afterEach(() => {
    clearBlockRenderers();
  });

  it("returns null for missing type", () => {
    expect(getBlockRenderer("schema", undefined)).toBeNull();
  });

  it("resolves schema-specific and wildcard renderers", () => {
    registerBlockRenderer(null, "markdown", A as any);
    registerBlockRenderer("schema-1", "markdown", B as any);

    expect(getBlockRenderer("schema-1", "markdown")).toBe(B as any);
    expect(getBlockRenderer("other", "markdown")).toBe(A as any);
    expect(getBlockRenderer(undefined, "markdown")).toBe(A as any);
    expect(getBlockRenderer("schema-1", "unknown")).toBeNull();
  });

  it("retires one renderer and falls back to the wildcard", () => {
    registerBlockRenderer(null, "markdown", A as any);
    registerBlockRenderer("schema-r", "markdown", B as any);

    expect(unregisterBlockRenderer("schema-r", "markdown")).toBe(true);
    expect(unregisterBlockRenderer("schema-r", "markdown")).toBe(false);
    expect(getBlockRenderer("schema-r", "markdown")).toBe(A as any);

    clearBlockRenderers();
    expect(getBlockRenderer(undefined, "markdown")).toBeNull();
  });

  it("registers a renderer for every core block type that declares one", async () => {
    // Clear the wildcard entries the tests above left behind, so the check
    // reads only what the real render catalog registers.
    clearBlockRenderers();
    await import("../../src/render-registrations");

    for (const type of CORE_BLOCK_TYPE_NAMES) {
      if (!CORE_BLOCK_TYPES[type].renderer) {
        continue;
      }
      expect(getBlockRenderer(undefined, type), `renderer for ${type}`).not.toBeNull();
    }
  });
});
