import { describe, expect, it } from "../vitest";

const { normaliseForStrategy } = await import("../../src/editor/strategy-normalisation");

describe("nightfire/editor/strategy-normalisation", () => {
	it("keeps the blocks array and reports schema mismatch", () => {
		const blocks = [
			{ type: "a", version: "initial", data: {} },
			{ type: "b", version: "initial", data: {} },
		];
		const result = normaliseForStrategy({ schema: "old", blocks }, "new", "single");
		expect(result.coerced).toEqual({ schema: "new", blocks });
		expect(result.schemaMismatch).toBe("old");
	});

	it("does not convert a leftover v1 block field", () => {
		expect(normaliseForStrategy({ schema: "same", block: { type: "a" } } as any, "same", "multi")).toEqual({
			coerced: { schema: "same", blocks: [] },
			schemaMismatch: null,
		});
	});

	it("handles empty blocks", () => {
		expect(normaliseForStrategy(null as any, "schema-a", "single")).toEqual({
			coerced: { schema: "schema-a", blocks: [] },
			schemaMismatch: null,
		});
	});

	it("keeps multi arrays in multi mode", () => {
		const blocks = [{ type: "a", version: "initial", data: {} }];
		expect(normaliseForStrategy({ schema: 123, blocks } as any, "schema-b", "multi")).toEqual({
			coerced: { schema: "schema-b", blocks },
			schemaMismatch: 123,
		});
	});
});
