import { describe, expect, it } from "bun:test";
import {
	findNightfireBlockById,
	formatNightfireMediaLocator,
	parseNightfireMediaLocator,
	resolveNightfireMediaLocator,
	type NightfireMediaLocator
} from "../../src/validation";

const value = {
	schema: "test:schema",
	blocks: [
		{
			id: "intro_01",
			type: "markdown",
			version: "initial",
			data: { text: "Hello" }
		},
		{
			id: "gallery_02",
			type: "gallery",
			version: "initial",
			data: {
				pages: [{ image_id: "media-1" }, { image_id: "media-2" }],
				"a/b": { "m~n": "media-3" }
			}
		}
	]
};

describe("nightfire/media-locator", () => {
	it("formats and parses canonical block-id locators", () => {
		const locatorKey = formatNightfireMediaLocator({
			blockId: "hero_01",
			dataPointer: "/pages/1/image_id"
		});

		expect(locatorKey).toBe("hero_01#/pages/1/image_id");
		expect(parseNightfireMediaLocator(locatorKey)).toEqual({
			blockId: "hero_01",
			dataPointer: "/pages/1/image_id"
		});
	});

	it("trims the block id", () => {
		expect(parseNightfireMediaLocator(" hero_01 #/image_id")).toEqual({
			blockId: "hero_01",
			dataPointer: "/image_id"
		});
	});

	it("resolves a media reference relative to block.data", () => {
		const locator = parseNightfireMediaLocator("gallery_02#/pages/1/image_id");

		expect(findNightfireBlockById(value, "gallery_02")).toEqual(value.blocks[1]);
		expect(resolveNightfireMediaLocator(value, locator)).toBe("media-2");
	});

	it("decodes ~0 and ~1 escapes", () => {
		expect(
			resolveNightfireMediaLocator(value, parseNightfireMediaLocator("gallery_02#/a~1b/m~0n"))
		).toBe("media-3");
	});

	it("resolves a pointer inside a nested block", () => {
		const nested = {
			schema: "test:schema",
			blocks: [
				{
					id: "list_01",
					type: "item_list",
					version: "initial",
					data: {
						items: [
							{
								id: "row_01",
								body: [
									{
										id: "gallery_02",
										type: "gallery",
										version: "initial",
										data: { pages: [{ image_id: "media-1" }, { image_id: "media-2" }] }
									}
								]
							}
						]
					}
				}
			]
		};

		expect(
			resolveNightfireMediaLocator(nested, parseNightfireMediaLocator("gallery_02#/pages/1/image_id"))
		).toBe("media-2");
	});

	it("returns undefined when the block or path does not exist", () => {
		expect(
			resolveNightfireMediaLocator(value, parseNightfireMediaLocator("gallery_02#/pages/9/image_id"))
		).toBeUndefined();
		expect(
			resolveNightfireMediaLocator(value, parseNightfireMediaLocator("gallery_02#/pages/01/image_id"))
		).toBeUndefined();
		expect(
			resolveNightfireMediaLocator(value, parseNightfireMediaLocator("gallery_02#/pages/ 1 /image_id"))
		).toBeUndefined();
		expect(
			resolveNightfireMediaLocator(value, parseNightfireMediaLocator("missing_03#/image_id"))
		).toBeUndefined();
	});

	it("resolves no prototype property", () => {
		for (const pointer of ["#/constructor", "#/toString", "#/__proto__"]) {
			expect(
				resolveNightfireMediaLocator(value, parseNightfireMediaLocator(`gallery_02${pointer}`)),
				pointer
			).toBeUndefined();
		}
	});

	it("rejects a locator without a separator or a block id", () => {
		expect(() => parseNightfireMediaLocator("hero_01:/image_id")).toThrow(/'#'/);
		expect(() => parseNightfireMediaLocator("#/image_id")).toThrow(/blockId/);
		expect(() => parseNightfireMediaLocator("  #/image_id")).toThrow(/blockId/);
		expect(() => formatNightfireMediaLocator({ blockId: " ", dataPointer: "/image_id" })).toThrow(/blockId/);
	});

	it("rejects a '#' in the block id", () => {
		expect(() => formatNightfireMediaLocator({ blockId: "hero#01", dataPointer: "/image_id" })).toThrow(
			/'#'/
		);
	});

	it("rejects a malformed pointer", () => {
		for (const dataPointer of ["", "image_id", "/a~2b", "/a~"]) {
			expect(
				() => formatNightfireMediaLocator({ blockId: "hero_01", dataPointer }),
				JSON.stringify(dataPointer)
			).toThrow(/JSON Pointer/);
			expect(
				() => parseNightfireMediaLocator(`hero_01#${dataPointer}`),
				JSON.stringify(dataPointer)
			).toThrow(/JSON Pointer/);
		}
	});

	it("validates a hand-built locator before resolving it", () => {
		const locator: NightfireMediaLocator = { blockId: "hero_01", dataPointer: "image_id" };
		expect(() => resolveNightfireMediaLocator(value, locator)).toThrow(/JSON Pointer/);
	});

	it("rejects a non-string block id or pointer as a domain error", () => {
		for (const blockId of [42, null, undefined, {}, []]) {
			expect(
				() => formatNightfireMediaLocator({ blockId, dataPointer: "/image_id" } as any),
				String(blockId)
			).toThrow(/blockId/);
		}

		expect(() =>
			formatNightfireMediaLocator({ blockId: "hero_01", dataPointer: 7 } as any)
		).toThrow(/JSON Pointer/);
	});

	it("finds a block by id without trusting every element to be a block", () => {
		const messy = {
			schema: "test:schema",
			blocks: [null, "block", 7, { id: "real", type: "markdown", version: "initial", data: {} }]
		} as any;

		expect(findNightfireBlockById(messy, "real")?.id).toBe("real");
		expect(findNightfireBlockById(messy, "missing")).toBeNull();
		expect(findNightfireBlockById({ schema: "s" } as any, "real")).toBeNull();
	});

	it("finds a nested block by id", () => {
		const nested = {
			schema: "test:schema",
			blocks: [
				{
					id: "list_01",
					type: "item_list",
					version: "initial",
					data: {
						items: [
							{
								id: "row_01",
								body: [
									{
										id: "gallery_02",
										type: "gallery",
										version: "initial",
										data: { pages: [] }
									}
								]
							}
						]
					}
				}
			]
		};

		const block = findNightfireBlockById(nested, "gallery_02");
		expect(block?.id).toBe("gallery_02");
		expect(block?.type).toBe("gallery");
	});

	it("does not address payload metadata that only looks like a block", () => {
		// `annotations` carries an `id` and a `data` but no block type, so it is
		// payload metadata. Its key sorts before `body`, so the metadata is
		// visited first: only the block-shape rule keeps it out.
		const value = {
			schema: "test:schema",
			blocks: [
				{
					id: "container_01",
					type: "item_list",
					version: "initial",
					data: {
						annotations: { id: "x", data: { media: "wrong" } },
						body: { id: "x", type: "image", version: "initial", data: { media: "right" } }
					}
				}
			]
		};

		expect(findNightfireBlockById(value as any, "x")?.type).toBe("image");
		expect(
			resolveNightfireMediaLocator(value as any, parseNightfireMediaLocator("x#/media"))
		).toBe("right");
	});

	it("visits nested sibling keys in code-point order, not insertion order", () => {
		const value = {
			schema: "test:schema",
			blocks: [
				{
					id: "container_01",
					type: "item_list",
					version: "initial",
					data: {
						// `z` is written first, `a` sorts first: both languages must
						// resolve the `a` block, so the answer does not depend on the
						// order the JSON happens to be written in.
						z: { id: "dup", type: "image", version: "initial", data: { media: "insertion-order" } },
						a: { id: "dup", type: "image", version: "initial", data: { media: "code-point" } }
					}
				}
			]
		};

		expect(
			resolveNightfireMediaLocator(value as any, parseNightfireMediaLocator("dup#/media"))
		).toBe("code-point");
		expect(findNightfireBlockById(value as any, "dup")?.data).toEqual({ media: "code-point" });
	});

	it("prefers a top-level block over a nested one with the same id", () => {
		const duplicated = {
			schema: "test:schema",
			blocks: [
				{
					id: "list_01",
					type: "item_list",
					version: "initial",
					data: {
						items: [{ id: "dup", type: "image", version: "initial", data: { image_id: "nested" } }]
					}
				},
				{ id: "dup", type: "image", version: "initial", data: { image_id: "top" } }
			]
		};

		expect(
			resolveNightfireMediaLocator(
				duplicated as any,
				parseNightfireMediaLocator("dup#/image_id")
			)
		).toBe("top");
	});
});
