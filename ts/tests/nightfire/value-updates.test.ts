import { describe, it, expect } from "../vitest";
import {
	asSingleBlockValue,
	asMultiBlockValue,
	replaceBlockAtIndex,
	changeBlockType,
	addBlock,
	insertBlockAfter
} from "../../src/editor/value-updates";

describe("nightfire value-updates", () => {
	it("builds single-block values as a one-item blocks array", () => {
		const block = { type: "markdown", data: { text: "Hello" } };
		expect(asSingleBlockValue("schema", block)).toMatchObject({
			schema: "schema",
			blocks: [
				{
					type: "markdown",
					data: { text: "Hello" },
					version: "initial"
				}
			]
		});
		expect(asSingleBlockValue("schema", block).block).toBeUndefined();
	});

	it("builds multi-block values", () => {
		const blocks = [{ type: "markdown" }, { type: "image" }];
		expect(asMultiBlockValue("schema", blocks)).toMatchObject({
			schema: "schema",
			blocks: [
				{ type: "markdown", data: {}, version: "initial" },
				{ type: "image", data: {}, version: "initial" }
			]
		});
	});

	it("replaces a block by index without mutating source", () => {
		const original = [{ type: "a" }, { type: "b" }];
		const next = replaceBlockAtIndex(original, 1, { type: "c" });
		expect(next).toMatchObject([{ type: "a" }, { type: "c", data: {}, version: "initial" }]);
		expect(next).not.toBe(original);
		expect(original).toEqual([{ type: "a" }, { type: "b" }]);
	});

	it("resets data and version on a type change, keeping the block id", () => {
		const changed = changeBlockType(
			{ id: "nf_keep", type: "markdown", version: "2", data: { text: "old", extra: true } },
			"example.option_list"
		);

		expect(changed).toEqual({
			id: "nf_keep",
			type: "example.option_list",
			version: "initial",
			data: {}
		});
	});

	it("omits the id on a type change when the block has none", () => {
		const changed = changeBlockType({ type: "markdown", data: { text: "old" } }, "custom");

		expect(changed).toEqual({ type: "custom", version: "initial", data: {} });
		expect(Object.keys(changed)).not.toContain("id");
	});

	it("normalises non-object input to a markdown block before a type change", () => {
		expect(changeBlockType("not-an-object", "markdown")).toEqual({
			type: "markdown",
			version: "initial",
			data: {}
		});
	});

	it("adds and inserts blocks with fresh ids", () => {
		const added = addBlock([], "markdown");
		expect(added).toHaveLength(1);
		expect(added[0]).toMatchObject({
			type: "markdown",
			version: "initial",
			data: {}
		});
		expect((added[0] as { id?: string }).id).toMatch(/^nf_/);
		expect((added[0] as { hash?: string }).hash).toBeUndefined();

		const inserted = insertBlockAfter([{ type: "a" }, { type: "b" }], 0, "markdown");
		expect(inserted).toHaveLength(3);
		expect(inserted[0]).toMatchObject({ type: "a" });
		expect(inserted[1]).toMatchObject({
			type: "markdown",
			version: "initial",
			data: {}
		});
		expect((inserted[1] as { id?: string }).id).toMatch(/^nf_/);
		expect(inserted[2]).toMatchObject({ type: "b" });
	});
});
