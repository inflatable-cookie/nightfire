import { describe, expect, it } from "../vitest";
import { registerSchema } from "../../src/editor-registry";

const { resolveSchemaDefinition } = await import("../../src/editor/schema-resolution");

describe("nightfire/editor/schema-resolution", () => {
	it("prefers requested schema when definition exists", () => {
		registerSchema({ schema: "requested", mode: "multi", defaultType: "section" });

		expect(resolveSchemaDefinition("requested", "fallback")).toEqual({
			editorSchema: "requested",
			registryDef: { schema: "requested", mode: "multi", defaultType: "section" },
		});
	});

	it("falls back to fallback schema or synthetic default", () => {
		registerSchema({ schema: "fallback", mode: "single", defaultType: "markdown" });

		expect(resolveSchemaDefinition("missing", "fallback")).toEqual({
			editorSchema: "fallback",
			registryDef: { schema: "fallback", mode: "single", defaultType: "markdown" },
		});

		expect(resolveSchemaDefinition("missing", "also-missing")).toEqual({
			editorSchema: "missing",
			registryDef: { schema: "missing", mode: "single", defaultType: "markdown" },
		});
	});
});
