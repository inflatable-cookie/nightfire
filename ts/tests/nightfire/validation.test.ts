import { describe, expect, it } from "bun:test";
import {
	registerBlockValidator,
	validateNightfireValue,
	prepareNightfireForSave,
} from "../../src/validation";
import type { BlockValidator } from "../../src/validation";

describe("nightfire/validation", () => {
	it("re-exports validator helpers", () => {
		const passthrough: BlockValidator = (block) => block;
		registerBlockValidator("schema-v", "markdown", (block: any) => ({
			...passthrough(block) as any,
			validated: true,
		}));

		const value = {
			schema: "schema-v",
			blocks: [{ type: "markdown", data: {} }],
		} as any;

		expect(validateNightfireValue(value)).toEqual({
			schema: "schema-v",
			blocks: [{ id: undefined, type: "markdown", version: "initial", data: {} }],
		});
		const prepared = prepareNightfireForSave(value);
		expect(prepared?.schema).toBe("schema-v");
		expect(prepared?.blocks[0]).toMatchObject({
			type: "markdown",
			version: "initial",
			data: {},
		});
		expect(prepared?.blocks[0]?.id).toMatch(/^nf_/);
	});
});
