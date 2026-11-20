import { describe, expect, it } from "bun:test";
import type { BlockTypeOption, SchemaDefinition } from "../../../src/editor-registry";
import { normaliseNightfireBlock } from "../../../src/utils";

describe("normaliseNightfireBlock", () => {
  const typeOptions: Array<BlockTypeOption> = [
    { type: "markdown", label: "Markdown" },
    { type: "custom", label: "Custom" }
  ];

  const definition: SchemaDefinition = {
    schema: "test:schema",
    mode: "single",
    defaultType: "markdown"
  };

  describe("valid block normalization", () => {
    it("preserves valid block with allowed type and drops hash", () => {
      const block = {
        type: "markdown",
        version: "v1",
        hash: "abc123",
        data: { text: "Hello" }
      };
      const result = normaliseNightfireBlock(block, typeOptions, definition);
      expect(result).toEqual({
        type: "markdown",
        version: "v1",
        data: { text: "Hello" }
      });
      expect((result as { hash?: string }).hash).toBeUndefined();
    });

    it("preserves custom block type if in options", () => {
      const block = {
        type: "custom",
        version: "v2",
        data: { foo: "bar" }
      };
      const result = normaliseNightfireBlock(block, typeOptions, definition);
      expect(result.type).toBe("custom");
    });
  });

  describe("type fallback", () => {
    it("falls back to first type option if type not allowed", () => {
      const block = {
        type: "unknown",
        version: "v1",
        data: {}
      };
      const result = normaliseNightfireBlock(block, typeOptions, definition);
      expect(result.type).toBe("markdown");
    });

    it("resets data and version when re-typing a disallowed block", () => {
      const block = {
        id: "keep_me",
        type: "unknown",
        version: "v9",
        data: { text: "written for another type" }
      };
      expect(normaliseNightfireBlock(block, typeOptions, definition)).toEqual({
        id: "keep_me",
        type: "markdown",
        version: "initial",
        data: {}
      });
    });

    it("falls back to definition defaultType if no type options", () => {
      const block = { type: "unknown" };
      const emptyOptions: Array<BlockTypeOption> = [];
      const result = normaliseNightfireBlock(block, emptyOptions, definition);
      expect(result.type).toBe("markdown");
    });

    it("falls back to markdown when no options and no definition defaultType", () => {
      const block = { type: "unknown" };
      const emptyOptions: Array<BlockTypeOption> = [];
      const noDefaultDefinition = {
        schema: "test:schema",
        mode: "single",
        defaultType: undefined
      } as any;
      const result = normaliseNightfireBlock(block, emptyOptions, noDefaultDefinition);
      expect(result.type).toBe("markdown");
    });
  });

  describe("null and undefined handling", () => {
    it("creates default block for null", () => {
      const result = normaliseNightfireBlock(null, typeOptions, definition);
      expect(result).toEqual({
        type: "markdown",
        version: "initial",
        data: {}
      });
    });

    it("creates default block for undefined", () => {
      const result = normaliseNightfireBlock(undefined, typeOptions, definition);
      expect(result).toEqual({
        type: "markdown",
        version: "initial",
        data: {}
      });
    });

    it("uses schema defaultType before the first registered type option", () => {
      const result = normaliseNightfireBlock(
        null,
        [
          { type: "content.list", label: "Content List" },
          { type: "markdown", label: "Markdown" }
        ],
        {
          schema: "example:content/description",
          mode: "single",
          defaultType: "markdown"
        }
      );

      expect(result).toEqual({
        type: "markdown",
        version: "initial",
        data: {}
      });
    });
  });

  describe("partial block handling", () => {
    it("fills missing version", () => {
      const block = { type: "markdown", data: { text: "Hi" } };
      const result = normaliseNightfireBlock(block, typeOptions, definition);
      expect(result.version).toBe("initial");
    });

    it("fills missing data", () => {
      const block = { type: "markdown", version: "v1" };
      const result = normaliseNightfireBlock(block, typeOptions, definition);
      expect(result.data).toEqual({});
    });

    it("replaces null data with empty object", () => {
      const block = { type: "markdown", version: "v1", data: null };
      const result = normaliseNightfireBlock(block, typeOptions, definition);
      expect(result.data).toEqual({});
    });
  });

  describe("non-object handling", () => {
    it("creates default for string input", () => {
      const result = normaliseNightfireBlock("invalid", typeOptions, definition);
      expect(result.type).toBe("markdown");
      expect(result.data).toEqual({});
    });

    it("creates default for number input", () => {
      const result = normaliseNightfireBlock(123, typeOptions, definition);
      expect(result.type).toBe("markdown");
    });

    it("creates default for array input", () => {
      const result = normaliseNightfireBlock([], typeOptions, definition);
      expect(result.type).toBe("markdown");
    });
  });
});
