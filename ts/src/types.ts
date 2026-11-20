export interface NightfireBlock {
  id?: string;
  type: string;
  version: string;
  data: Record<string, unknown>;
}

export interface NightfireValue {
  schema: string;
  blocks: Array<NightfireBlock>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/**
 * Coerce one stored block.
 *
 * Only an object is a block. A string, number, boolean or array is not an empty
 * block: fabricating one fills an editor with content nobody wrote. `null` means
 * "no block here", and the caller decides what to do with that.
 */
export function coerceNightfireBlock(
  value: unknown,
  fallbackType: string | null = null
): NightfireBlock | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const type =
    typeof record.type === "string" && record.type.trim().length > 0 ? record.type : fallbackType;

  if (!type) {
    return null;
  }

  return {
    // A blank id is no id. `block-ids.ts` treats whitespace as missing too.
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : undefined,
    type,
    version: typeof record.version === "string" ? record.version : "initial",
    data: asRecord(record.data) ?? {}
  };
}
