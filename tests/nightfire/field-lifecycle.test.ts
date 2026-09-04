import { describe, expect, it, vi } from "../vitest";

const { createPrepareWriter, createRequiredInitialValue } = await import("../../src/editor/field-lifecycle");

describe("nightfire/editor/field-lifecycle", () => {
	it("creates required initial values as a blocks array for both modes", () => {
		for (const mode of ["single", "multi"] as const) {
			const value = createRequiredInitialValue(`schema-${mode}`, mode, "markdown");
			expect(value.schema).toBe(`schema-${mode}`);
			expect(value.blocks).toHaveLength(1);
			expect(value.blocks[0]).toEqual(expect.objectContaining({
				type: "markdown",
				version: "initial",
				data: {},
			}));
			expect(value.blocks[0]?.id).toMatch(/^nf_/);
		}
	});

	it("creates prepare writer closure that writes to FormData", () => {
		const getValue = vi.fn(() => ({ schema: "s", blocks: [{ type: "markdown", data: {} }] }));
		const getName = vi.fn(() => "content");
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
