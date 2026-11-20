import { afterEach, describe, expect, it } from "../vitest";
import {
	clearBlockValidators,
	prepareNightfireForSave,
	registerBlockValidator,
	unregisterBlockValidator,
	validateNightfireValue,
	writePreparedNightfireToFormData,
} from "../../src/validator-registry";
import { clearBlockVersions, registerBlockVersions } from "../../src/block-versions";

describe("nightfire/validator-registry", () => {
	afterEach(() => {
		clearBlockValidators();
		clearBlockVersions();
	});

	it("validates blocks using schema-specific and wildcard validators", () => {
		registerBlockValidator(null, "markdown", (block: any) => ({ ...block, wildcard: true }));
		registerBlockValidator("schema-1", "markdown", (block: any) => ({ ...block, scoped: true }));

		expect(
			validateNightfireValue({
				schema: "schema-1",
				blocks: [{ type: "markdown", data: {} }],
			} as any)
		).toEqual({
			schema: "schema-1",
			blocks: [{ id: undefined, type: "markdown", version: "initial", data: {} }],
		});

		expect(
			validateNightfireValue({
				schema: "schema-x",
				blocks: [{ type: "markdown", data: {} }],
			} as any)
		).toEqual({
			schema: "schema-x",
			blocks: [{ id: undefined, type: "markdown", version: "initial", data: {} }],
		});
	});

	it("retires a validator", () => {
		registerBlockValidator("schema-r", "markdown", () => null);
		expect(
			validateNightfireValue({ schema: "schema-r", blocks: [{ type: "markdown", data: {} }] } as any)
		).toEqual({ schema: "schema-r", blocks: [] });

		expect(unregisterBlockValidator("schema-r", "markdown")).toBe(true);
		expect(
			validateNightfireValue({ schema: "schema-r", blocks: [{ type: "markdown", data: {} }] } as any)
		).toEqual({
			schema: "schema-r",
			blocks: [{ id: undefined, type: "markdown", version: "initial", data: {} }],
		});
	});

	it("fails a non-object value closed without crashing", () => {
		for (const value of [null, undefined, "text", 42, ["a"]]) {
			expect(validateNightfireValue(value as any), String(value)).toEqual({ schema: "", blocks: [] });
		}
	});

	it("rejects a hybrid envelope and a missing or empty schema", () => {
		expect(
			validateNightfireValue({
				schema: "schema-x",
				block: { type: "markdown", data: {} },
				blocks: [{ type: "markdown", data: {} }],
			} as any)
		).toEqual({ schema: "", blocks: [] });

		expect(
			validateNightfireValue({
				schema: "schema-x",
				block: null,
				blocks: [{ type: "markdown", data: {} }],
			} as any)
		).toEqual({ schema: "", blocks: [] });

		expect(
			validateNightfireValue({ blocks: [{ type: "markdown", data: {} }] } as any)
		).toEqual({ schema: "", blocks: [] });

		expect(
			validateNightfireValue({ schema: "   ", blocks: [{ type: "markdown", data: {} }] } as any)
		).toEqual({ schema: "", blocks: [] });
	});

	it("drops blocks a validator answers with a non-block", () => {
		registerBlockValidator("schema-m", "markdown", () => "not a block");
		registerBlockValidator("schema-n", "markdown", () => ({ data: { text: "no type" } }));

		expect(
			validateNightfireValue({ schema: "schema-m", blocks: [{ type: "markdown", data: {} }] } as any)
		).toEqual({ schema: "schema-m", blocks: [] });
		expect(
			validateNightfireValue({ schema: "schema-n", blocks: [{ type: "markdown", data: {} }] } as any)
		).toEqual({ schema: "schema-n", blocks: [] });
	});

	it("drops blocks that are not objects and keeps a valid one", () => {
		expect(
			validateNightfireValue({
				schema: "schema-x",
				blocks: [null, "block", [], { data: {} }, { type: "markdown", data: {} }],
			} as any)
		).toEqual({
			schema: "schema-x",
			blocks: [{ id: undefined, type: "markdown", version: "initial", data: {} }],
		});
	});

	it("prepares a save with stable block ids and refuses an empty one", () => {
		const prepared = prepareNightfireForSave({
			schema: "s",
			blocks: [{ type: "x", data: {} }],
		} as any);

		expect(prepared?.schema).toBe("s");
		expect(prepared?.blocks[0]).toMatchObject({ type: "x", version: "initial", data: {} });
		expect(prepared?.blocks[0]?.id).toMatch(/^nf_/);

		expect(prepareNightfireForSave({ schema: "s", blocks: [] } as any)).toBeNull();
		expect(prepareNightfireForSave({ schema: "", blocks: [{ type: "x" }] } as any)).toBeNull();
		expect(
			prepareNightfireForSave({
				schema: "schema-x",
				block: { type: "markdown", data: {} },
			} as any)
		).toBeNull();
	});

	it("writes prepared Nightfire JSON to FormData with stable block ids", () => {
		const formData = new FormData();

		writePreparedNightfireToFormData(formData, "content", {
			schema: "schema-x",
			blocks: [
				{
					type: "markdown",
					data: {
						image_id: "media-1",
					},
				},
			],
		});

		const raw = formData.get("content");
		expect(typeof raw).toBe("string");

		const parsed = JSON.parse(raw as string);
		expect(parsed).toMatchObject({
			schema: "schema-x",
			blocks: [
				{
					type: "markdown",
					data: {
						image_id: "media-1",
					},
				},
			],
		});
		expect(parsed.block).toBeUndefined();
		expect(parsed.blocks[0].id).toMatch(/^nf_/);
		expect(parsed.blocks[0].hash).toBeUndefined();
	});

	it("writes empty string when prepared Nightfire content is empty", () => {
		const formData = new FormData();
		writePreparedNightfireToFormData(formData, "content", { schema: "schema-x", blocks: [] });
		expect(formData.get("content")).toBe("");
	});

	it("coerces a supported older version and rejects unknown versions", () => {
		registerBlockVersions("callout", { current: "2", supported: ["1", "2"] });

		expect(
			validateNightfireValue({
				schema: "schema-x",
				blocks: [{ type: "callout", version: "1", data: {} }],
			} as any)
		).toEqual({
			schema: "schema-x",
			blocks: [{ id: undefined, type: "callout", version: "2", data: {} }],
		});

		expect(
			validateNightfireValue({
				schema: "schema-x",
				blocks: [{ type: "callout", version: "9", data: {} }],
			} as any)
		).toEqual({
			schema: "schema-x",
			blocks: [],
		});
	});
});
