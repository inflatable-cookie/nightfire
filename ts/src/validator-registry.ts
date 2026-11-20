import { coerceNightfireBlock } from "./types";
import type { NightfireBlock, NightfireValue } from "./types";
import { ensureNightfireBlockIds } from "./block-ids";
import { resolveBlockVersion } from "./block-versions";
import { SchemaScopedRegistry } from "./registry-map";

export type BlockValidator = (block: unknown) => unknown;

const validators = new SchemaScopedRegistry<BlockValidator>();

export function registerBlockValidator(
  schema: string | null,
  type: string,
  fn: BlockValidator
): void {
  validators.set(schema, type, fn);
}

export function unregisterBlockValidator(schema: string | null, type: string): boolean {
  return validators.delete(schema, type);
}

export function clearBlockValidators(): void {
  validators.clear();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validateBlock(schema: string, block: unknown): NightfireBlock | null {
  const typedBlock = coerceNightfireBlock(block);
  if (!typedBlock) {
    return null;
  }

  const currentVersion = resolveBlockVersion(typedBlock.type, typedBlock.version);
  if (!currentVersion) {
    return null;
  }
  typedBlock.version = currentVersion;

  const fn = validators.get(schema, typedBlock.type);
  if (!fn) {
    return typedBlock;
  }

  // A validator is consumer code: a throw fails this block closed rather than
  // taking down the whole save path.
  let answer: unknown;
  try {
    answer = fn(typedBlock);
  } catch {
    return null;
  }

  const validated = asRecord(answer);
  // A validator answers with a block. A primitive, an array or a typeless
  // object is a malformed answer, so the block fails closed instead of being
  // replaced by an empty one.
  if (!validated || typeof validated.type !== "string" || validated.type.trim().length === 0) {
    return null;
  }

  // An explicit version must be a version, not a number or null that coercion
  // would quietly rewrite to `initial`. A validator that says nothing about the
  // version inherits the resolved one through coercion, as before.
  if (Object.hasOwn(validated, "version") && typeof validated.version !== "string") {
    return null;
  }

  const result = coerceNightfireBlock(validated);
  if (!result) {
    return null;
  }

  // A validator may retype or re-version what it was handed, so the answer goes
  // through version resolution again. Skipping it would let a validator smuggle
  // an unknown version past the save boundary.
  const resolved = resolveBlockVersion(result.type, result.version);
  if (!resolved) {
    return null;
  }
  result.version = resolved;

  return result;
}

function readEnvelope(value: unknown): { schema: string; blocks: Array<unknown> } | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  // A sibling `block` is the legacy v1 envelope. A value carrying both shapes is
  // hybrid and is trusted under neither, even when `block` is null.
  if (Object.hasOwn(record, "block")) {
    return null;
  }

  const schema = typeof record.schema === "string" ? record.schema : "";
  if (schema.trim().length === 0) {
    return null;
  }

  // A schema-bearing envelope without a blocks array is malformed, not empty:
  // coercing `blocks: "bad"` to `[]` would silently accept a corrupt value.
  if (!Array.isArray(record.blocks)) {
    return null;
  }

  return { schema, blocks: record.blocks };
}

/**
 * Validate a value's blocks and resolve every supported version to the current
 * one. Invalid input fails closed to an empty envelope: no schema, no blocks.
 */
export function validateNightfireValue(value: NightfireValue): NightfireValue {
  const envelope = readEnvelope(value);
  if (!envelope) {
    return { schema: "", blocks: [] };
  }

  const blocks = envelope.blocks
    .map((block) => validateBlock(envelope.schema, block))
    .filter((block): block is NightfireBlock => block !== null);

  return { schema: envelope.schema, blocks };
}

export function prepareNightfireForSave(value: NightfireValue): NightfireValue | null {
  const validated = validateNightfireValue(value);
  if (validated.schema.length === 0 || validated.blocks.length === 0) {
    return null;
  }

  return ensureNightfireBlockIds(validated);
}

/**
 * Write a Nightfire field into FormData using the canonical save boundary.
 *
 * This keeps the outer form field contract simple while ensuring the inner
 * Nightfire JSON is validated, block-id-stable, and serialized verbatim.
 *
 * Caller note:
 * - map surrounding DTO field names at the API boundary if needed
 * - do not rewrite keys inside block `data` objects; shared extractors match
 *   the stored Nightfire JSON exactly
 */
export function writePreparedNightfireToFormData(
  formData: FormData,
  name: string,
  value: NightfireValue | null | undefined
): void {
  const prepared = value ? prepareNightfireForSave(value) : null;
  formData.set(name, prepared ? JSON.stringify(prepared) : "");
}
