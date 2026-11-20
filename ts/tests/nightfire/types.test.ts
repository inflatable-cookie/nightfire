import { describe, expect, it } from "../vitest";
import { coerceNightfireBlock } from "../../src/types";

describe("nightfire/types coerceNightfireBlock", () => {
	it("keeps an object block and fills the missing version and data", () => {
		expect(coerceNightfireBlock({ id: "nf_1", type: "markdown" })).toEqual({
			id: "nf_1",
			type: "markdown",
			version: "initial",
			data: {},
		});
	});

	it("drops a blank id and a non-object data payload", () => {
		expect(coerceNightfireBlock({ id: "  ", type: "markdown", data: ["x"] })).toEqual({
			id: undefined,
			type: "markdown",
			version: "initial",
			data: {},
		});
	});

	it("uses the fallback type when the block has no usable type", () => {
		expect(coerceNightfireBlock({ type: " " }, "markdown")).toEqual({
			id: undefined,
			type: "markdown",
			version: "initial",
			data: {},
		});
		expect(coerceNightfireBlock({}, null)).toBeNull();
	});

	it("refuses a non-object value instead of fabricating an empty block", () => {
		for (const value of [undefined, null, "text", 42, true, ["a"], () => {}]) {
			expect(coerceNightfireBlock(value, "markdown"), String(value)).toBeNull();
		}
	});
});
