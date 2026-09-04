import { describe, expect, it } from "../vitest";
import fixture from "../../../fixtures/wire/v1/nightfire-values.json";
import { generateNightfireBlockId } from "../../src/block-ids";
import {
  getBlockVersions,
  registerBlockVersions
} from "../../src/block-versions";
import {
  findNightfireBlockById,
  formatNightfireMediaLocator,
  parseNightfireMediaLocator,
  resolveNightfireMediaLocator
} from "../../src/media-locator";
import {
  configureNightfireStrategies,
  getStrategy
} from "../../src/strategies";
import type { NightfireStrategy } from "../../src/strategies";
import { normaliseNightfireValue } from "../../src/utils";
import {
  prepareNightfireForSave,
  registerBlockValidator,
  validateNightfireValue
} from "../../src/validator-registry";

function registerSharedBlocks(): void {
  const allowed = new Set(fixture.registry.strategy.allowedTypes);
  const allowedCategories = new Set(fixture.registry.strategy.allowedCategories);
  for (const block of fixture.registry.blocks) {
    registerBlockVersions(block.type, {
      current: block.current,
      supported: block.supported
    });
    registerBlockValidator(
      null,
      block.type,
      allowed.has(block.type) || allowedCategories.has(block.category)
        ? (value) => value
        : () => null
    );
  }
}

describe("Nightfire Rust/TypeScript wire conformance v1", () => {
  it("round-trips every versioned v2 envelope", () => {
    for (const entry of fixture.values) {
      expect(normaliseNightfireValue(entry.value, entry.value.schema)).toEqual(entry.value);
    }
  });

  it("generates ids using the shared contract", () => {
    const id = generateNightfireBlockId();
    const expected = fixture.idGeneration;

    expect(id.startsWith(expected.prefix)).toBe(true);
    expect(id.length).toBe(expected.length);
    expect(id[expected.versionNibble.index]).toBe(expected.versionNibble.value);
    expect(expected.variantNibble.allowed).toContain(id[expected.variantNibble.index]);
  });

  it("builds the real block-version registry from the shared contract", () => {
    registerSharedBlocks();

    for (const expected of fixture.registry.blocks) {
      expect(getBlockVersions(expected.type)).toEqual({
        current: expected.current,
        supported: expected.supported
      });
    }
  });

  it("loads the shared strategy through the real strategy store", async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {}
    });

    try {
      configureNightfireStrategies({
        fetchStrategies: async () => [fixture.registry.strategy as NightfireStrategy]
      });
      expect(await getStrategy(fixture.registry.strategy.id)).toEqual(
        fixture.registry.strategy
      );
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
    }
  });

  it("validates shared cases through the real registries", () => {
    registerSharedBlocks();

    for (const testCase of fixture.validationCases) {
      const validated = validateNightfireValue(testCase.value);
      const accepted =
        validated.blocks.length > 0 &&
        validated.blocks.length === testCase.value.blocks.length;

      expect(accepted).toBe(testCase.accepted);
      expect(validated.blocks.map((block) => block.version)).toEqual(
        testCase.resolvedVersions
      );
    }
  });

  it("resolves shared media locator cases", () => {
    const value = fixture.mediaValue;

    for (const expected of fixture.mediaLocatorCases) {
      const locator = parseNightfireMediaLocator(expected.locator);
      expect(locator).toEqual({
        blockId: expected.blockId,
        dataPointer: expected.dataPointer
      });
      expect(formatNightfireMediaLocator(locator)).toBe(expected.locator);

      const block = findNightfireBlockById(value, expected.blockId);
      const resolved = resolveNightfireMediaLocator(value, locator);
      expect(block !== null && resolved !== undefined).toBe(expected.found);
      expect(resolved ?? null).toBe(expected.resolved);
    }
  });

  it("rejects legacy v1 sibling block/hash envelopes", () => {
    expect(normaliseNightfireValue(fixture.rejectedV1, fixture.rejectedV1.schema)).toEqual({
      schema: fixture.rejectedV1.schema,
      blocks: [],
    });
    expect(prepareNightfireForSave(fixture.rejectedV1 as never)).toBeNull();
  });
});
