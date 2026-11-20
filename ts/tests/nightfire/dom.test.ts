import { describe, expect, it } from "bun:test";
import { createStableId } from "../../src/dom";

describe("nightfire/dom createStableId", () => {
	it("prefixes the id and is unique per call", () => {
		const ids = new Set<string>();
		for (let index = 0; index < 200; index += 1) {
			const id = createStableId("nightfire-listbox");
			expect(id.startsWith("nightfire-listbox-")).toBe(true);
			expect(id.length).toBeGreaterThan("nightfire-listbox-".length);
			ids.add(id);
		}
		expect(ids.size).toBe(200);
	});

	it("mints different ids for the same prefix in two renders", () => {
		// Two SSR requests in one process render the same component. A module
		// counter leaks position between them; a random token does not.
		expect(createStableId("same")).not.toBe(createStableId("same"));
	});
});
