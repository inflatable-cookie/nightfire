import { describe, expect, it } from "bun:test";
import {
  assertSupportedSchema,
  type JsonSchema,
  type SchemaCatalog,
  validate,
} from "../../scripts/schema-documents";

// The validator refuses a keyword it cannot enforce instead of ignoring it, and
// compares enum, const and uniqueItems members by value rather than by the
// serialised text, so key order never decides the result.

const catalog: SchemaCatalog = {
  repoRoot: "/nightfire",
  schemaRoot: "/nightfire/schemas",
  documents: new Map(),
  rawDocuments: new Map(),
};

const SCHEMA_PATH = "/nightfire/schemas/synthetic.schema.json";

function errors(value: unknown, schema: JsonSchema): string[] {
  return validate(catalog, value, schema, SCHEMA_PATH);
}

describe("tooling/schema-documents", () => {
  it("refuses an unsupported keyword at the document's top level", () => {
    expect(() =>
      assertSupportedSchema({ type: "string", pattern: "^a" }, "synthetic.schema.json")
    ).toThrow(/unsupported JSON Schema keyword `pattern`/);
  });

  it("refuses an unsupported keyword nested in properties, items and combinators", () => {
    const nested: JsonSchema = {
      type: "object",
      properties: {
        rows: { type: "array", items: { type: "string", maxLength: 2 } },
      },
    };
    expect(() => assertSupportedSchema(nested, "synthetic.schema.json")).toThrow(
      /unsupported JSON Schema keyword `maxLength`/
    );
    expect(() =>
      assertSupportedSchema({ anyOf: [{ type: "string", format: "email" }] }, "synthetic.schema.json")
    ).toThrow(/unsupported JSON Schema keyword `format`/);
  });

  it("matches enum members regardless of key order", () => {
    const schema: JsonSchema = {
      enum: [
        { align: "left", width: 2 },
        { width: 2, align: "center" },
      ],
    };
    expect(errors({ width: 2, align: "left" }, schema)).toEqual([]);
    expect(errors({ width: 2, align: "right" }, schema)).toEqual(["$: value is not in enum"]);
  });

  it("matches const regardless of key order, and keeps types distinct", () => {
    const schema: JsonSchema = { const: { rows: [], caption: null } };
    expect(errors({ caption: null, rows: [] }, schema)).toEqual([]);
    expect(errors({ caption: null, rows: [{}] }, schema)).toEqual([
      "$: value does not match const",
    ]);
    expect(errors(1, { const: 2 })).toEqual(["$: value does not match const"]);
  });

  it("treats reordered duplicate items as duplicates for uniqueItems", () => {
    const schema: JsonSchema = { type: "array", uniqueItems: true };
    expect(errors([{ a: 1, b: 2 }, { b: 2, a: 1 }], schema)).toEqual([
      "$: items are not unique",
    ]);
    expect(errors([{ a: 1, b: 2 }, { a: 1, b: 3 }], schema)).toEqual([]);
  });
});
