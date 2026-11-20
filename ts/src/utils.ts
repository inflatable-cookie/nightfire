import {
  coerceNightfireBlock,
  type NightfireBlock,
  type NightfireValue
} from "./types";
import {
  isBlockContentEmpty,
  type BlockTypeOption,
  type SchemaDefinition
} from "./editor-registry";

function asRecord(value: unknown): Record<string, unknown> | null {
  // v1 `{ block }` is not accepted. Dual-shape conversion is gone.
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return "block" in record && record.block != null ? null : record;
}

function readBlocks(record: Record<string, unknown>, defaultType: string): NightfireBlock[] {
  if (!Array.isArray(record.blocks)) {
    return [];
  }

  return record.blocks
    .map((block) => coerceNightfireBlock(block, defaultType))
    .filter((block): block is NightfireBlock => block !== null);
}

/**
 * Normalises a value that may be a raw string (legacy data) into Nightfire
 * draft state with a durable `{ schema, blocks }` envelope when content exists.
 *
 * v1 `{ schema, block }` values are rejected, not converted.
 */
export function normaliseNightfireValue(
  value: unknown,
  schema: string,
  allowedBlockTypes?: string[] | null
): NightfireValue {
  const defaultType = allowedBlockTypes?.[0] ?? "markdown";
  const record = asRecord(value);

  if (record) {
    return {
      schema: typeof record.schema === "string" ? record.schema : schema,
      blocks: readBlocks(record, defaultType)
    };
  }

  if (typeof value === "string" && value.length > 0) {
    // A raw string is markdown. When markdown is not allowed the content is
    // dropped rather than re-typed into an empty block of some other type.
    if (allowedBlockTypes && !allowedBlockTypes.includes("markdown")) {
      return { schema, blocks: [] };
    }

    return {
      schema,
      blocks: [{ type: "markdown", version: "initial", data: { text: value } }]
    };
  }

  return { schema, blocks: [] };
}

export function normaliseNightfireBlock(
  block: unknown,
  typeOptions: BlockTypeOption[],
  definition: SchemaDefinition
): NightfireBlock {
  const allowed = typeOptions.map((option) => option.type);
  const defaultType =
    definition.defaultType ?? typeOptions[0]?.type ?? "markdown";
  const normalized = coerceNightfireBlock(block, defaultType) ?? {
    type: defaultType,
    version: "initial",
    data: {}
  };

  if (allowed.includes(normalized.type)) {
    return normalized;
  }

  // Re-typing a block to the default type resets its data and version: both
  // belonged to the type it was not. The block keeps its id.
  return {
    ...normalized,
    type: defaultType,
    version: "initial",
    data: {}
  };
}

/**
 * Checks whether a NightfireValue is empty.
 *
 * When `contentLevel` is true (default) the check delegates to
 * per-block-type empty checkers registered via `registerBlockEmptyChecker`.
 * This means a markdown block with blank text is treated as empty even
 * though the block structure exists. When no checker is registered for a
 * block type the block is assumed non-empty (conservative default).
 *
 * When `contentLevel` is false only structural presence is checked
 * (i.e. does a blocks array contain any items).
 */
export function isEmptyNightfire(
  value: NightfireValue | null | undefined,
  contentLevel: boolean = true
): boolean {
  if (!value || typeof value !== "object") return true;

  const blocks = Array.isArray(value.blocks) ? value.blocks : [];
  if (blocks.length === 0) return true;
  if (!contentLevel) return false;
  return blocks.every((b) => isBlockContentEmpty(b));
}
