import type { NightfireValue } from "../types";
import { normaliseNightfireValue } from "../utils";

export interface StrategyNormalisationResult {
  coerced: NightfireValue;
  schemaMismatch: string | null;
}

export function normaliseForStrategy(
  value: NightfireValue,
  schema: string
): StrategyNormalisationResult {
  const normalised = normaliseNightfireValue(value, schema);
  const actualSchema = value?.schema ?? null;

  return {
    coerced: {
      schema,
      blocks: Array.isArray(normalised.blocks) ? normalised.blocks : []
    },
    schemaMismatch: actualSchema && actualSchema !== schema ? actualSchema : null
  };
}
