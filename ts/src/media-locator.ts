import type { NightfireBlock, NightfireValue } from "./types";

export interface NightfireMediaLocator {
  blockId: string;
  dataPointer: string;
}

const ARRAY_INDEX = /^(?:0|[1-9]\d*)$/;

const NOT_FOUND = Symbol("nightfire-media-locator-not-found");
type Lookup = unknown | typeof NOT_FOUND;

const INVALID_POINTER =
  "Nightfire media locator requires a non-empty, slash-prefixed JSON Pointer";

/**
 * True for a well-formed RFC 6901 pointer: non-empty, slash-prefixed, and every
 * `~` escapes `0` or `1`. Mirrors `is_well_formed_pointer` in the Rust crate.
 */
function isWellFormedPointer(pointer: string): boolean {
  if (!pointer.startsWith("/")) {
    return false;
  }

  for (let index = 0; index < pointer.length; index += 1) {
    if (pointer[index] !== "~") {
      continue;
    }

    const escaped = pointer[index + 1];
    if (escaped !== "0" && escaped !== "1") {
      return false;
    }
    index += 1;
  }

  return true;
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function resolveJsonPointer(value: unknown, pointer: string): unknown {
  return pointer
    .slice(1)
    .split("/")
    .map(decodePointerSegment)
    .reduce<unknown>((current, segment) => {
      if (current === null || typeof current !== "object") {
        return undefined;
      }

      if (Array.isArray(current)) {
        // An array index is `0` or a digit string without a leading zero. `""`,
        // `01` and ` 1 ` name no element.
        return ARRAY_INDEX.test(segment) ? current[Number(segment)] : undefined;
      }

      // Own properties only: `#/constructor` and `#/toString` resolve to nothing.
      return Object.hasOwn(current, segment)
        ? (current as Record<string, unknown>)[segment]
        : undefined;
    }, value);
}

function readLocator(locator: NightfireMediaLocator): NightfireMediaLocator {
  const blockId = locator.blockId.trim();
  if (!blockId) {
    throw new Error("Nightfire media locator requires a blockId");
  }

  if (blockId.includes("#")) {
    throw new Error("Nightfire media locator blockId must not contain '#'");
  }

  if (!isWellFormedPointer(locator.dataPointer)) {
    throw new Error(INVALID_POINTER);
  }

  return { blockId, dataPointer: locator.dataPointer };
}

export function formatNightfireMediaLocator(locator: NightfireMediaLocator): string {
  const { blockId, dataPointer } = readLocator(locator);
  return `${blockId}#${dataPointer}`;
}

export function parseNightfireMediaLocator(locatorKey: string): NightfireMediaLocator {
  const separator = locatorKey.indexOf("#");
  if (separator < 0) {
    throw new Error("Nightfire media locator must contain '#'");
  }

  return readLocator({
    blockId: locatorKey.slice(0, separator),
    dataPointer: locatorKey.slice(separator + 1)
  });
}

export function findNightfireBlockById(
  value: NightfireValue,
  blockId: string
): NightfireBlock | null {
  if (!Array.isArray(value.blocks)) {
    return null;
  }

  return value.blocks.find((block) => block.id === blockId) ?? null;
}

/**
 * A block's `data`, anchored on its id, wherever the block sits: a top-level
 * block of the value, or a nested block inside another block's data (an
 * `item_list` item body, for instance). Mirrors `find_block_data_in_value` in
 * the Rust crate.
 */
function findBlockData(value: NightfireValue, blockId: string): Lookup {
  if (!Array.isArray(value.blocks)) {
    return NOT_FOUND;
  }

  for (const block of value.blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }

    if (block.id === blockId) {
      return block.data ?? {};
    }

    const nested = findBlockDataInJson(block.data, blockId);
    if (nested !== NOT_FOUND) {
      return nested;
    }
  }

  return NOT_FOUND;
}

function findBlockDataInJson(value: unknown, blockId: string): Lookup {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findBlockDataInJson(item, blockId);
      if (found !== NOT_FOUND) {
        return found;
      }
    }
    return NOT_FOUND;
  }

  if (value === null || typeof value !== "object") {
    return NOT_FOUND;
  }

  const record = value as Record<string, unknown>;
  if (record.id === blockId && Object.hasOwn(record, "data")) {
    return record.data;
  }

  for (const child of Object.values(record)) {
    const found = findBlockDataInJson(child, blockId);
    if (found !== NOT_FOUND) {
      return found;
    }
  }

  return NOT_FOUND;
}

export function resolveNightfireMediaLocator(
  value: NightfireValue,
  locator: NightfireMediaLocator
): unknown {
  const { blockId, dataPointer } = readLocator(locator);
  const data = findBlockData(value, blockId);
  if (data === NOT_FOUND) {
    return undefined;
  }

  return resolveJsonPointer(data, dataPointer);
}
