import type { NightfireValue } from "../types";
import { createDefaultBlock } from "./block-list";
import { writePreparedNightfireToFormData } from "../validation";

export type NightfireFieldMode = "single" | "multi";

export function createRequiredInitialValue(schema: string, defaultType: string): NightfireValue {
  return {
    schema,
    blocks: [createDefaultBlock(defaultType)]
  };
}

export function createPrepareWriter(
  getValue: () => NightfireValue,
  getName: () => string
): (formData: FormData) => void {
  return (formData: FormData) => {
    writePreparedNightfireToFormData(formData, getName(), getValue());
  };
}
