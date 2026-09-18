import { describe, expect, it } from "../vitest";
import { CORE_BLOCK_TYPES, CORE_BLOCK_TYPE_NAMES } from "../../src/core-blocks";
import { getBlockEditor, isBlockContentEmpty } from "../../src/editor-registry";
import { getBlockRenderer } from "../../src/render-registry";

// Importing the catalogs is the act of self-registration: a consumer that imports
// the editor catalog gets every core editor, and the render catalog gets every core
// renderer, without composing anything by hand.
import "../../src/editor-registrations";
import "../../src/render-registrations";

describe("nightfire/core self-registration", () => {
	it("declares a vocabulary", () => {
		expect(CORE_BLOCK_TYPE_NAMES.length).toBeGreaterThan(0);
		expect(CORE_BLOCK_TYPE_NAMES).toContain("markdown");
		expect(CORE_BLOCK_TYPE_NAMES).toContain("download_card");
	});

	it("registers a renderer for every type that declares one", () => {
		for (const type of CORE_BLOCK_TYPE_NAMES) {
			if (!CORE_BLOCK_TYPES[type].renderer) continue;
			expect(getBlockRenderer(undefined, type), `renderer for ${type}`).not.toBeNull();
		}
	});

	it("registers an editor for every type that declares one", () => {
		for (const type of CORE_BLOCK_TYPE_NAMES) {
			if (!CORE_BLOCK_TYPES[type].editor) continue;
			expect(getBlockEditor(undefined, type), `editor for ${type}`).not.toBeNull();
		}
	});

	it("answers emptiness for every type that declares a checker", () => {
		for (const type of CORE_BLOCK_TYPE_NAMES) {
			if (!CORE_BLOCK_TYPES[type].emptyChecker) continue;
			expect(typeof isBlockContentEmpty({ type, data: {} }), `checker for ${type}`).toBe("boolean");
		}
	});

	it("does not claim a capability it has not registered", () => {
		// The guard against the drift this whole declaration exists to prevent:
		// flipping a flag without wiring the part must fail here.
		const pending = CORE_BLOCK_TYPE_NAMES.filter((t) => !CORE_BLOCK_TYPES[t].renderer);
		for (const type of pending) {
			expect(getBlockRenderer(undefined, type), `unexpected renderer for ${type}`).toBeNull();
		}
	});
});
