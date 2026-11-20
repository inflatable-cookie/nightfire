import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  clearBlockValidators,
  prepareNightfireForSave,
  registerBlockValidator,
  unregisterBlockValidator,
  validateNightfireValue,
  writePreparedNightfireToFormData
} from "../../src/validator-registry";
import type { BlockValidator } from "../../src/validation";
import { clearBlockVersions, registerBlockVersions } from "../../src/block-versions";

// `./validation` re-exports the validator type; the annotation proves the
// published name resolves to the registry's function shape.
const typedWildcardValidator: BlockValidator = (block: any) => ({
  ...block,
  data: { ...block.data, origin: "wildcard" }
});

describe("nightfire/validator-registry", () => {
  afterEach(() => {
    clearBlockValidators();
    clearBlockVersions();
  });

  it("applies a schema-scoped validator over the wildcard, and the wildcard elsewhere", () => {
    const wildcard = mock(typedWildcardValidator);
    const scoped = mock((block: any) => ({ ...block, data: { ...block.data, origin: "scoped" } }));
    registerBlockValidator(null, "markdown", wildcard);
    registerBlockValidator("schema-1", "markdown", scoped);

    expect(
      validateNightfireValue({
        schema: "schema-1",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-1",
      blocks: [{ id: undefined, type: "markdown", version: "initial", data: { origin: "scoped" } }]
    });
    expect(scoped).toHaveBeenCalledTimes(1);
    expect(wildcard).not.toHaveBeenCalled();

    expect(
      validateNightfireValue({
        schema: "schema-x",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-x",
      blocks: [
        { id: undefined, type: "markdown", version: "initial", data: { origin: "wildcard" } }
      ]
    });
    expect(wildcard).toHaveBeenCalledTimes(1);
    expect(scoped).toHaveBeenCalledTimes(1);
  });

  it("retires a validator", () => {
    registerBlockValidator("schema-r", "markdown", () => null);
    expect(
      validateNightfireValue({
        schema: "schema-r",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({ schema: "schema-r", blocks: [] });

    expect(unregisterBlockValidator("schema-r", "markdown")).toBe(true);
    expect(
      validateNightfireValue({
        schema: "schema-r",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-r",
      blocks: [{ id: undefined, type: "markdown", version: "initial", data: {} }]
    });
  });

  it("fails a non-object value closed without crashing", () => {
    for (const value of [null, undefined, "text", 42, ["a"]]) {
      expect(validateNightfireValue(value as any), String(value)).toEqual({
        schema: "",
        blocks: []
      });
    }
  });

  it("rejects a hybrid envelope and a missing or empty schema", () => {
    expect(
      validateNightfireValue({
        schema: "schema-x",
        block: { type: "markdown", data: {} },
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({ schema: "", blocks: [] });

    expect(
      validateNightfireValue({
        schema: "schema-x",
        block: null,
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({ schema: "", blocks: [] });

    expect(validateNightfireValue({ blocks: [{ type: "markdown", data: {} }] } as any)).toEqual({
      schema: "",
      blocks: []
    });

    expect(
      validateNightfireValue({ schema: "   ", blocks: [{ type: "markdown", data: {} }] } as any)
    ).toEqual({ schema: "", blocks: [] });
  });

  it("drops blocks a validator answers with a non-block", () => {
    registerBlockValidator("schema-m", "markdown", () => "not a block");
    registerBlockValidator("schema-n", "markdown", () => ({ data: { text: "no type" } }));

    expect(
      validateNightfireValue({
        schema: "schema-m",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({ schema: "schema-m", blocks: [] });
    expect(
      validateNightfireValue({
        schema: "schema-n",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({ schema: "schema-n", blocks: [] });
  });

  it("re-resolves the version a validator answers with", () => {
    registerBlockVersions("callout", { current: "2", supported: ["1", "2"] });

    // Retyping to a registered type resolves against that type's versions.
    registerBlockValidator("schema-retype", "markdown", (block: any) => ({
      ...block,
      type: "callout",
      version: "1"
    }));
    expect(
      validateNightfireValue({
        schema: "schema-retype",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-retype",
      blocks: [{ id: undefined, type: "callout", version: "2", data: {} }]
    });

    // A version the type does not support cannot be smuggled past validation.
    registerBlockValidator("schema-version", "markdown", (block: any) => ({
      ...block,
      version: "9"
    }));
    expect(
      validateNightfireValue({
        schema: "schema-version",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({ schema: "schema-version", blocks: [] });

    // A retyped block whose new type is unregistered also fails closed.
    registerBlockValidator("schema-unknown-type", "markdown", (block: any) => ({
      ...block,
      type: "unregistered",
      version: "2"
    }));
    expect(
      validateNightfireValue({
        schema: "schema-unknown-type",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({ schema: "schema-unknown-type", blocks: [] });
  });

  it("rejects a validator answer whose version is not a string", () => {
    for (const version of [42, null, undefined, {}, true]) {
      registerBlockValidator("schema-bad-version", "markdown", (block: any) => ({
        ...block,
        version
      }));

      // Coercion would rewrite this to `initial` and save a version the
      // validator never asked for. An explicit bad version fails closed.
      expect(
        validateNightfireValue({
          schema: "schema-bad-version",
          blocks: [{ type: "markdown", data: {} }]
        } as any),
        String(version)
      ).toEqual({ schema: "schema-bad-version", blocks: [] });
    }
  });

  it("still coerces a validator answer that omits the version", () => {
    registerBlockValidator("schema-no-version", "markdown", () => ({
      type: "markdown",
      data: { text: "kept" }
    }));

    expect(
      validateNightfireValue({
        schema: "schema-no-version",
        blocks: [{ type: "markdown", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-no-version",
      blocks: [{ id: undefined, type: "markdown", version: "initial", data: { text: "kept" } }]
    });
  });

  it("fails a block closed when a validator throws", () => {
    registerBlockValidator("schema-t", "markdown", () => {
      throw new Error("validator exploded");
    });

    expect(
      validateNightfireValue({
        schema: "schema-t",
        blocks: [
          { type: "markdown", data: {} },
          { type: "other", data: {} }
        ]
      } as any)
    ).toEqual({
      schema: "schema-t",
      blocks: [{ id: undefined, type: "other", version: "initial", data: {} }]
    });
  });

  it("rejects an envelope whose blocks member is not an array", () => {
    for (const blocks of ["bad", null, {}, 3]) {
      expect(validateNightfireValue({ schema: "schema-x", blocks } as any), String(blocks)).toEqual(
        { schema: "", blocks: [] }
      );
    }

    expect(validateNightfireValue({ schema: "schema-x" } as any)).toEqual({
      schema: "",
      blocks: []
    });
  });

  it("drops blocks that are not objects and keeps a valid one", () => {
    expect(
      validateNightfireValue({
        schema: "schema-x",
        blocks: [null, "block", [], { data: {} }, { type: "markdown", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-x",
      blocks: [{ id: undefined, type: "markdown", version: "initial", data: {} }]
    });
  });

  it("prepares a save with stable block ids and refuses an empty one", () => {
    const prepared = prepareNightfireForSave({
      schema: "s",
      blocks: [{ type: "x", data: {} }]
    } as any);

    expect(prepared?.schema).toBe("s");
    expect(prepared?.blocks[0]).toMatchObject({ type: "x", version: "initial", data: {} });
    expect(prepared?.blocks[0]?.id).toMatch(/^nf_/);

    expect(prepareNightfireForSave({ schema: "s", blocks: [] } as any)).toBeNull();
    expect(prepareNightfireForSave({ schema: "", blocks: [{ type: "x" }] } as any)).toBeNull();
  });

  it("writes prepared Nightfire JSON to FormData with stable block ids", () => {
    const formData = new FormData();

    writePreparedNightfireToFormData(formData, "content", {
      schema: "schema-x",
      blocks: [
        {
          type: "markdown",
          data: {
            image_id: "media-1"
          }
        }
      ]
    } as any);

    const raw = formData.get("content");
    expect(typeof raw).toBe("string");

    const parsed = JSON.parse(raw as string);
    expect(parsed).toMatchObject({
      schema: "schema-x",
      blocks: [
        {
          type: "markdown",
          data: {
            image_id: "media-1"
          }
        }
      ]
    });
    expect(parsed.block).toBeUndefined();
    expect(parsed.blocks[0].id).toMatch(/^nf_/);
    expect(parsed.blocks[0].hash).toBeUndefined();
  });

  it("writes empty string when prepared Nightfire content is empty", () => {
    const formData = new FormData();
    writePreparedNightfireToFormData(formData, "content", { schema: "schema-x", blocks: [] });
    expect(formData.get("content")).toBe("");
  });

  it("coerces a supported older version and rejects unknown versions", () => {
    registerBlockVersions("callout", { current: "2", supported: ["1", "2"] });

    expect(
      validateNightfireValue({
        schema: "schema-x",
        blocks: [{ type: "callout", version: "1", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-x",
      blocks: [{ id: undefined, type: "callout", version: "2", data: {} }]
    });

    expect(
      validateNightfireValue({
        schema: "schema-x",
        blocks: [{ type: "callout", version: "9", data: {} }]
      } as any)
    ).toEqual({
      schema: "schema-x",
      blocks: []
    });
  });
});
