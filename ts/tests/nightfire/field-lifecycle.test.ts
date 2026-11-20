import { describe, expect, it, mock } from "bun:test";

const { createPrepareWriter, createRequiredInitialValue } = await import("../../src/editor/field-lifecycle");

describe("nightfire/editor/field-lifecycle", () => {
	it("creates required initial values as a one-block array with a fresh id", () => {
		const value = createRequiredInitialValue("schema-a", "markdown");
		expect(value.schema).toBe("schema-a");
		expect(value.blocks).toHaveLength(1);
		expect(value.blocks[0]).toEqual(expect.objectContaining({
			type: "markdown",
			version: "initial",
			data: {},
		}));
		expect(value.blocks[0]?.id).toMatch(/^nf_/);
	});

	it("creates prepare writer closure that writes to FormData", () => {
		const getValue = mock(() => ({ schema: "s", blocks: [{ type: "markdown", data: {} }] }));
		const getName = mock(() => "content");
		const formData = new FormData();

		const writer = createPrepareWriter(getValue as any, getName);
		writer(formData);

		const written = JSON.parse(String(formData.get("content")));
		expect(written).toEqual(expect.objectContaining({ schema: "s" }));
		expect(written.blocks[0]).toEqual(expect.objectContaining({
			type: "markdown",
			version: "initial",
			data: {},
		}));
		expect(written.blocks[0].id).toMatch(/^nf_/);
	});
});
