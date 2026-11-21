import { describe, expect, it } from "bun:test";
import { assertSupportedSchema, validate } from "../../scripts/schema-documents";
import type { JsonSchema, SchemaCatalog } from "../../scripts/schema-documents";

// The validator refuses a keyword it cannot enforce instead of ignoring it, and
// compares enum, const and uniqueItems members by value rather than by the
// serialised text, so key order never decides the result.

const catalog: SchemaCatalog = {
  repoRoot: "/nightfire",
  schemaRoot: "/nightfire/schemas",
  documents: new Map(),
  rawDocuments: new Map()
};

const SCHEMA_PATH = "/nightfire/schemas/synthetic.schema.json";

function errors(value: unknown, schema: JsonSchema): Array<string> {
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
        rows: { type: "array", items: { type: "string", maxLength: 2 } }
      }
    };
    expect(() => assertSupportedSchema(nested, "synthetic.schema.json")).toThrow(
      /unsupported JSON Schema keyword `maxLength`/
    );
    expect(() =>
      assertSupportedSchema(
        { anyOf: [{ type: "string", format: "email" }] },
        "synthetic.schema.json"
      )
    ).toThrow(/unsupported JSON Schema keyword `format`/);
  });

  it("matches enum members regardless of key order", () => {
    const schema: JsonSchema = {
      enum: [
        { align: "left", width: 2 },
        { width: 2, align: "center" }
      ]
    };
    expect(errors({ width: 2, align: "left" }, schema)).toEqual([]);
    expect(errors({ width: 2, align: "right" }, schema)).toEqual(["$: value is not in enum"]);
  });

  it("matches const regardless of key order, and keeps types distinct", () => {
    const schema: JsonSchema = { const: { rows: [], caption: null } };
    expect(errors({ caption: null, rows: [] }, schema)).toEqual([]);
    expect(errors({ caption: null, rows: [{}] }, schema)).toEqual([
      "$: value does not match const"
    ]);
    expect(errors(1, { const: 2 })).toEqual(["$: value does not match const"]);
  });

  it("treats prototype names as ordinary own-property keys", () => {
    expect(errors({}, { type: "object", required: ["toString", "constructor"] })).toEqual([
      "$: missing toString",
      "$: missing constructor"
    ]);
    expect(
      errors(
        { toString: "value", constructor: 3 },
        {
          type: "object",
          properties: { toString: { type: "string" }, constructor: { type: "integer" } }
        }
      )
    ).toEqual([]);
  });

  it("treats reordered duplicate items as duplicates for uniqueItems", () => {
    const schema: JsonSchema = { type: "array", uniqueItems: true };
    expect(
      errors(
        [
          { a: 1, b: 2 },
          { b: 2, a: 1 }
        ],
        schema
      )
    ).toEqual(["$: items are not unique"]);
    expect(
      errors(
        [
          { a: 1, b: 2 },
          { a: 1, b: 3 }
        ],
        schema
      )
    ).toEqual([]);
  });

  it("applies both a $ref target and the keywords beside it", () => {
    const document: JsonSchema = {
      $ref: "#/$defs/name",
      minLength: 3,
      enum: ["abc", "abd"],
      $defs: { name: { type: "string" } }
    };
    const withDefs: SchemaCatalog = {
      ...catalog,
      documents: new Map([[SCHEMA_PATH, document as Record<string, unknown>]])
    };
    const check = (value: unknown) => validate(withDefs, value, document, SCHEMA_PATH);

    expect(check("abc")).toEqual([]);
    // The sibling `minLength` and `enum` are not dropped when `$ref` is present.
    expect(check("ab")).toEqual(["$: value is not in enum", "$: shorter than minLength 3"]);
    // The referenced `type` still applies, and the sibling `enum` reports too.
    expect(check(12)).toEqual(["$: expected string", "$: value is not in enum"]);
    expect(check("abz")).toEqual(["$: value is not in enum"]);
  });

  it("refuses an unsupported keyword beside $ref", () => {
    expect(() =>
      assertSupportedSchema({ $ref: "#/$defs/name", pattern: "^a" }, "synthetic.schema.json")
    ).toThrow(/unsupported JSON Schema keyword `pattern`/);
  });

  it("accepts a value that matches any member of an array-form type", () => {
    const schema: JsonSchema = { type: ["string", "null"] };
    expect(errors("a", schema)).toEqual([]);
    expect(errors(null, schema)).toEqual([]);
    expect(errors(1, schema)).toEqual(["$: expected string or null"]);
  });

  it("fails closed on an unknown or empty type name", () => {
    expect(() => assertSupportedSchema({ type: "date" }, "synthetic.schema.json")).toThrow(
      /unsupported schema type "date"/
    );
    expect(() =>
      assertSupportedSchema({ type: ["string", "any"] }, "synthetic.schema.json")
    ).toThrow(/unsupported schema type "any"/);
    expect(() => assertSupportedSchema({ type: [] }, "synthetic.schema.json")).toThrow(
      /non-empty array of type names/
    );
    // An earlier member that matches must not let a later unknown name pass.
    expect(() => errors("a", { type: ["string", "any"] })).toThrow(/unsupported schema type "any"/);
  });
});
