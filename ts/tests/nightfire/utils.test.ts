import { afterEach, describe, expect, it } from "bun:test";
import { clearBlockEmptyCheckers, registerBlockEmptyChecker } from "../../src/editor-registry";
import {
  isEmptyNightfire,
  normaliseNightfireBlock,
  normaliseNightfireValue
} from "../../src/utils";

describe("nightfire/utils", () => {
  afterEach(() => {
    clearBlockEmptyCheckers();
  });

  it("normalises raw strings only when markdown is allowed", () => {
    expect(normaliseNightfireValue("Hello", "article")).toEqual({
      schema: "article",
      blocks: [{ type: "markdown", version: "initial", data: { text: "Hello" } }]
    });
    expect(
      normaliseNightfireValue("Hello", "article", ["markdown", "callout"]).blocks
    ).toHaveLength(1);
    expect(normaliseNightfireValue("Hello", "article", ["callout"])).toEqual({
      schema: "article",
      blocks: []
    });
  });

  it("uses the requested schema for a blank stored schema and rejects v1", () => {
    expect(normaliseNightfireValue({ schema: "  ", blocks: [] }, "article")).toEqual({
      schema: "article",
      blocks: []
    });
    expect(normaliseNightfireValue({ schema: "article", block: {} }, "article")).toEqual({
      schema: "article",
      blocks: []
    });
  });

  it("retypes invalid blocks with reset data and version", () => {
    expect(
      normaliseNightfireBlock(
        { id: "block-1", type: "retired", version: "v7", data: { old: true } },
        [{ type: "callout", label: "Callout" }],
        { schema: "article", mode: "single", defaultType: "callout" }
      )
    ).toEqual({ id: "block-1", type: "callout", version: "initial", data: {} });
  });

  it("falls back when the definition default type is blank", () => {
    expect(
      normaliseNightfireBlock(
        { type: "retired", version: "v1", data: { old: true } },
        [{ type: "callout", label: "Callout" }],
        { schema: "article", mode: "single", defaultType: "   " }
      )
    ).toEqual({ type: "callout", version: "initial", data: {} });
  });

  it("checks structural and content emptiness", () => {
    const value = { schema: "article", blocks: [{ type: "markdown", data: { text: " " } }] };
    registerBlockEmptyChecker("markdown", (block) => block.data.text.trim().length === 0);

    expect(isEmptyNightfire(null)).toBe(true);
    expect(isEmptyNightfire(value)).toBe(true);
    expect(isEmptyNightfire(value, false)).toBe(false);
    expect(isEmptyNightfire({ schema: "article", blocks: [{ type: "unknown", data: {} }] })).toBe(
      false
    );
  });
});
