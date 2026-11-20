import { describe, expect, it } from "bun:test";
import { normaliseNightfireValue } from "../../../src/utils";

describe("normaliseNightfireValue", () => {
	const testSchema = "test:content/article";

	describe("valid NightfireValue objects", () => {
		it("passes through valid v2 NightfireValue unchanged", () => {
			const value = {
				schema: testSchema,
				blocks: [
					{
						type: "markdown",
						version: "initial",
						data: { text: "Hello world" },
					},
				],
			};
			const result = normaliseNightfireValue(value, testSchema);
			expect(result).toEqual(value);
		});

		it("passes through NightfireValue with different schema", () => {
			const value = {
				schema: "other:schema",
				blocks: [{ type: "custom", version: "v1", data: {} }],
			};
			const result = normaliseNightfireValue(value, testSchema);
			expect(result.schema).toBe("other:schema");
		});

		it("passes through NightfireValue with multiple blocks", () => {
			const value = {
				schema: testSchema,
				blocks: [
					{ type: "markdown", version: "initial", data: { text: "One" } },
					{ type: "markdown", version: "initial", data: { text: "Two" } },
				],
			};
			const result = normaliseNightfireValue(value, testSchema);
			expect(result).toEqual(value);
		});

		it("rejects v1 { block } envelopes instead of converting them", () => {
			const result = normaliseNightfireValue(
				{
					schema: testSchema,
					block: {
						type: "markdown",
						version: "initial",
						hash: "abc123",
						data: { text: "Hello world" },
					},
				},
				testSchema
			);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});
	});

	describe("raw string conversion", () => {
		it("converts non-empty string to markdown block", () => {
			const result = normaliseNightfireValue("Hello world", testSchema);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [
					{
						type: "markdown",
						version: "initial",
						data: { text: "Hello world" },
					},
				],
			});
		});

		it("converts string with markdown content", () => {
			const markdown = "# Title\n\nSome **bold** text.";
			const result = normaliseNightfireValue(markdown, testSchema);
			expect(result.blocks[0]?.data).toEqual({ text: markdown });
		});

		it("drops a raw string when markdown is not an allowed type", () => {
			expect(normaliseNightfireValue("Hello", testSchema, ["custom", "other"])).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});

		it("drops a raw string when the allowed block types list is empty", () => {
			expect(normaliseNightfireValue("Hello", testSchema, [])).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});

		it("converts string if markdown is in allowed types", () => {
			const result = normaliseNightfireValue("Hello", testSchema, ["markdown", "custom"]);
			expect(result.blocks[0]?.type).toBe("markdown");
			expect(result.blocks[0]?.data).toEqual({ text: "Hello" });
		});
	});

	describe("null and undefined handling", () => {
		it("returns empty blocks for null", () => {
			const result = normaliseNightfireValue(null, testSchema);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});

		it("returns empty blocks for undefined", () => {
			const result = normaliseNightfireValue(undefined, testSchema);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});

		it("returns empty blocks for empty string", () => {
			const result = normaliseNightfireValue("", testSchema);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});
	});

	describe("edge cases", () => {
		it("handles number input", () => {
			const result = normaliseNightfireValue(123 as any, testSchema);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});

		it("handles array input", () => {
			const result = normaliseNightfireValue(["a", "b"] as any, testSchema);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});

		it("handles object without schema property", () => {
			const result = normaliseNightfireValue({ foo: "bar" } as any, testSchema);
			expect(result).toEqual({
				schema: testSchema,
				blocks: [],
			});
		});
	});
});
