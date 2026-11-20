import { describe, expect, it } from "bun:test";
import { registerSchema } from "../../src/editor-registry";

const { resolveSchemaDefinition } = await import("../../src/editor/schema-resolution");

describe("nightfire/editor/schema-resolution", () => {
  it("returns the registered mode and default type when the schema has a definition", () => {
    registerSchema({ schema: "requested", mode: "multi", defaultType: "section" });

    expect(resolveSchemaDefinition("requested")).toEqual({
      mode: "multi",
      defaultType: "section"
    });
  });

  it("falls back to a single markdown block for an unregistered schema", () => {
    expect(resolveSchemaDefinition("unregistered:schema")).toEqual({
      mode: "single",
      defaultType: "markdown"
    });
  });
});
