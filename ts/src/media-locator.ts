import type { NightfireBlock, NightfireValue } from "./types";

export interface NightfireMediaLocator {
  blockId: string;
  dataPointer: string;
}

const ARRAY_INDEX = /^(?:0|[1-9]\d*)$/;

const NOT_FOUND = Symbol("nightfire-media-locator-not-found");
type Lookup = unknown | typeof NOT_FOUND;

const INVALID_POINTER = "Nightfire media locator requires a non-empty, slash-prefixed JSON Pointer";

/**
 * True for a well-formed RFC 6901 pointer: non-empty, slash-prefixed, and every
 * `~` escapes `0` or `1`. Mirrors `is_well_formed_pointer` in the Rust crate.
 */
function isWellFormedPointer(pointer: unknown): boolean {
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
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
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
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
      return isObjectRecord(current) && Object.hasOwn(current, segment)
        ? current[segment]
        : undefined;
    }, value);
}

function readLocator(locator: NightfireMediaLocator): NightfireMediaLocator {
  // A locator arrives from stored data or another language's caller, so the
  // shape is checked here rather than trusted from the type: a non-string id
  // is a domain error, not a `TypeError` from `.trim()`.
  if (typeof locator.blockId !== "string") {
    throw new Error("Nightfire media locator requires a string blockId");
  }

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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function codePoint(character: string | undefined): number {
  return character?.codePointAt(0) ?? 0;
}

/**
 * Compare two strings by Unicode code point. The Rust resolver compares
 * `serde_json` map keys as UTF-8 bytes, which orders by code point too, so this
 * is the same order in both languages.
 */
function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left);
  const b = Array.from(right);
  const shared = Math.min(a.length, b.length);

  for (let index = 0; index < shared; index += 1) {
    const difference = codePoint(a[index]) - codePoint(b[index]);
    if (difference !== 0) {
      return difference;
    }
  }

  return a.length - b.length;
}

/**
 * Sibling keys in ascending code-point order.
 *
 * JavaScript visits properties in insertion order, which is a fact about the
 * JSON text rather than about the document, so a duplicate nested id would
 * resolve differently from one parse to the next. Sorting makes the traversal
 * canonical, and matches the Rust resolver.
 */
function sortedKeys(record: Record<string, unknown>): Array<string> {
  return Object.keys(record).sort(compareCodePoints);
}

/**
 * A nested payload is a block when it carries the id being looked up, a string
 * `type` and a `data` member. Everything else that happens to have an `id` and
 * a `data` is payload metadata, not a block, and a locator must not address it.
 *
 * Both the block lookup and the data lookup use this one rule, so they always
 * name the same object.
 */
function isNestedBlockRecord(
  value: Record<string, unknown>,
  blockId: string
): value is Record<string, unknown> & NightfireBlock {
  return value.id === blockId && typeof value.type === "string" && Object.hasOwn(value, "data");
}

export function findNightfireBlockById(
  value: NightfireValue,
  blockId: string
): NightfireBlock | null {
  if (!Array.isArray(value.blocks)) {
    return null;
  }

  const topLevel = value.blocks.find((block) => isObjectRecord(block) && block.id === blockId);
  if (topLevel) {
    return topLevel;
  }

  // Then nested blocks, which live in another block's `data` (an `item_list`
  // item body, for instance) and are not top-level blocks of the value.
  for (const block of value.blocks) {
    if (!isObjectRecord(block)) {
      continue;
    }
    const nested = findBlockInJson(block.data, blockId);
    if (nested) {
      return nested;
    }
  }

  return null;
}

/** A nested block object: it carries an id, a type and a `data` member. */
function findBlockInJson(value: unknown, blockId: string): NightfireBlock | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findBlockInJson(item, blockId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isObjectRecord(value)) {
    return null;
  }

  if (isNestedBlockRecord(value, blockId)) {
    return value;
  }

  for (const key of sortedKeys(value)) {
    const found = findBlockInJson(value[key], blockId);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * A block's `data`, anchored on its id, wherever the block sits: a top-level
 * block of the value, or a nested block inside another block's data (an
 * `item_list` item body, for instance).
 */
function findBlockData(value: NightfireValue, blockId: string): Lookup {
  const block = findNightfireBlockById(value, blockId);
  return block ? (block.data ?? {}) : NOT_FOUND;
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
