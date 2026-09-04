import { describe, expect, it } from "../vitest";
import fixture from "../../../fixtures/wire/v1/nightfire-values.json";
import { generateNightfireBlockId } from "../../src/block-ids";
import { registerBlockVersions, resolveBlockVersion } from "../../src/block-versions";
import { normaliseNightfireValue } from "../../src/utils";
import { prepareNightfireForSave, validateNightfireValue } from "../../src/validator-registry";

describe("Nightfire Rust/TypeScript wire conformance v1", () => {
  it("preserves versioned empty, single, and multi envelopes", () => {
    for (const entry of fixture.values) {
      expect(normaliseNightfireValue(entry.value, entry.value.schema)).toEqual(entry.value);
    }
  });

  it("generates simple UUIDv7 block ids matching the Rust wire contract", () => {
    expect(generateNightfireBlockId()).toMatch(/^nf_[0-9a-f]{12}7[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
  });

  it("coerces supported versions and rejects unknown versions", () => {
    const spec = fixture.versionCoercion;
    registerBlockVersions(spec.type, { current: spec.current, supported: spec.supported });
    expect(resolveBlockVersion(spec.type, spec.stored)).toBe(spec.current);
    expect(resolveBlockVersion(spec.type, spec.unknown)).toBeNull();

    const value = fixture.values.find((entry) => entry.name === "multi")!.value;
    const validated = validateNightfireValue(value);
    expect(validated.blocks[1]?.version).toBe(spec.current);
  });

  it("rejects legacy v1 sibling block/hash envelopes", () => {
    expect(normaliseNightfireValue(fixture.rejectedV1, fixture.rejectedV1.schema)).toEqual({
      schema: fixture.rejectedV1.schema,
      blocks: [],
    });
    expect(prepareNightfireForSave(fixture.rejectedV1 as never)).toBeNull();
  });
});
