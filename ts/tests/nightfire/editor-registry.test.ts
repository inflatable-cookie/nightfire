import { afterEach, describe, expect, it } from "bun:test";
import { CORE_BLOCK_TYPES, CORE_BLOCK_TYPE_NAMES } from "../../src/core-blocks";
import {
  clearBlockEditors,
  clearBlockEmptyCheckers,
  clearSchemas,
  getBlockEditor,
  getBlockTypeLabel,
  getBlockTypeOptionsForSchema,
  getSchemaDefinition,
  isBlockContentEmpty,
  registerBlockEditor,
  registerBlockEmptyChecker,
  registerSchema,
  unregisterBlockEditor,
  unregisterBlockEmptyChecker,
  unregisterSchema
} from "../../src/editor-registry";

const EditorA = Symbol("EditorA");
const EditorB = Symbol("EditorB");
const WildcardEditor = Symbol("WildcardEditor");

describe("nightfire/editor-registry", () => {
  afterEach(() => {
    clearSchemas();
    clearBlockEditors();
    clearBlockEmptyCheckers();
  });

  it("registers and resolves schema definitions", () => {
    registerSchema({ schema: "s1", mode: "single", defaultType: "markdown" });
    expect(getSchemaDefinition("s1")).toEqual({
      schema: "s1",
      mode: "single",
      defaultType: "markdown"
    });
    expect(getSchemaDefinition("missing")).toBeNull();

    expect(unregisterSchema("s1")).toBe(true);
    expect(getSchemaDefinition("s1")).toBeNull();
  });

  it("registers block editors and type options without duplicates", () => {
    registerBlockEditor("s2", "markdown", "Markdown", EditorA as any);
    registerBlockEditor("s2", "callout", "Callout", EditorB as any);

    expect(getBlockEditor("s2", "markdown")).toBe(EditorA as any);
    expect(getBlockEditor("s2", "callout")).toBe(EditorB as any);
    expect(getBlockEditor("s2", "missing")).toBeNull();

    expect(getBlockTypeOptionsForSchema("s2")).toEqual([
      { type: "markdown", label: "Markdown" },
      { type: "callout", label: "Callout" }
    ]);
    expect(getBlockTypeLabel("s2", "markdown")).toBe("Markdown");
    expect(getBlockTypeLabel("s2", "missing")).toBeNull();
    expect(getBlockTypeLabel("missing", "markdown")).toBeNull();
    expect(getBlockTypeOptionsForSchema("missing")).toEqual([]);
  });

  it("updates the label when (schema, type) is registered again", () => {
    registerBlockEditor("s3", "markdown", "Markdown", EditorA as any);
    registerBlockEditor("s3", "markdown", "Markdown v2", EditorB as any);

    expect(getBlockEditor("s3", "markdown")).toBe(EditorB as any);
    expect(getBlockTypeOptionsForSchema("s3")).toEqual([
      { type: "markdown", label: "Markdown v2" }
    ]);
    expect(getBlockTypeLabel("s3", "markdown")).toBe("Markdown v2");
  });

  it("lets a schema-specific label beat the wildcard label", () => {
    registerBlockEditor(null, "markdown", "Markdown", WildcardEditor as any);
    registerBlockEditor(null, "image", "Image", WildcardEditor as any);
    registerBlockEditor("s4", "markdown", "Acme markdown", EditorA as any);
    registerBlockEditor("s4", "table", "Table", EditorB as any);

    expect(getBlockTypeLabel("s4", "markdown")).toBe("Acme markdown");
    expect(getBlockTypeLabel("other", "markdown")).toBe("Markdown");
    expect(getBlockTypeOptionsForSchema("s4")).toEqual([
      { type: "markdown", label: "Acme markdown" },
      { type: "table", label: "Table" },
      { type: "image", label: "Image" }
    ]);
    expect(getBlockEditor("s4", "markdown")).toBe(EditorA as any);
    expect(getBlockEditor("other", "markdown")).toBe(WildcardEditor as any);
  });

  it("retires one editor without disturbing the wildcard", () => {
    registerBlockEditor(null, "markdown", "Markdown", WildcardEditor as any);
    registerBlockEditor("s5", "markdown", "Acme markdown", EditorA as any);

    expect(unregisterBlockEditor("s5", "markdown")).toBe(true);
    expect(getBlockEditor("s5", "markdown")).toBe(WildcardEditor as any);
    expect(getBlockTypeLabel("s5", "markdown")).toBe("Markdown");
  });

  it("checks block emptiness via registered checker with safe defaults", () => {
    expect(isBlockContentEmpty(null)).toBe(true);
    expect(isBlockContentEmpty({})).toBe(true);
    expect(isBlockContentEmpty({ type: "unknown", data: {} })).toBe(false);

    registerBlockEmptyChecker("markdown", (block) => {
      const text = block?.data?.text;
      return !text || typeof text !== "string" || text.trim().length === 0;
    });

    expect(isBlockContentEmpty({ type: "markdown", data: { text: "" } })).toBe(true);
    expect(isBlockContentEmpty({ type: "markdown", data: { text: "  " } })).toBe(true);
    expect(isBlockContentEmpty({ type: "markdown", data: { text: "hello" } })).toBe(false);

    expect(unregisterBlockEmptyChecker("markdown")).toBe(true);
    expect(isBlockContentEmpty({ type: "markdown", data: { text: "" } })).toBe(false);
  });

  it("registers an editor for every core block type that declares one", async () => {
    // The real catalog, unmocked. The import runs once per test file, and
    // beforeEach has just cleared the registry, so a registration that does
    // not happen here fails the test rather than passing on leftovers.
    await import("../../src/editor-registrations");

    for (const type of CORE_BLOCK_TYPE_NAMES) {
      if (!CORE_BLOCK_TYPES[type].editor) {
        continue;
      }
      expect(getBlockEditor(undefined, type), `editor for ${type}`).not.toBeNull();
    }
  });
});
