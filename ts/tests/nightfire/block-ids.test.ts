import { afterEach, describe, expect, it } from "../vitest";
import {
	ensureNightfireBlockId,
	ensureNightfireBlockIds,
	generateNightfireBlockId
} from "../../src/block-ids";

describe("nightfire/block-ids", () => {
	it("generates unique nf_ ids", () => {
		const first = generateNightfireBlockId();
		const second = generateNightfireBlockId();

		expect(first).toMatch(/^nf_[0-9a-f]{32}$/);
		expect(second).toMatch(/^nf_[0-9a-f]{32}$/);
		expect(first).not.toBe(second);
	});

	it("keeps a present id and assigns a missing or blank one", () => {
		const present = { id: "existing_block", type: "markdown", version: "initial", data: {} };
		expect(ensureNightfireBlockId(present)).toBe(present);

		for (const block of [
			{ type: "markdown", version: "initial", data: {} },
			{ id: "   ", type: "markdown", version: "initial", data: {} }
		]) {
			expect(ensureNightfireBlockId(block).id).toMatch(/^nf_/);
		}
	});

	it("assigns ids across every block in a value", () => {
		const value = ensureNightfireBlockIds({
			schema: "test:schema",
			blocks: [
				{ id: "kept", type: "markdown", version: "initial", data: {} },
				{ type: "markdown", version: "initial", data: {} }
			]
		});

		expect(value.schema).toBe("test:schema");
		expect(value.blocks[0]?.id).toBe("kept");
		expect(value.blocks[1]?.id).toMatch(/^nf_/);
	});
});
