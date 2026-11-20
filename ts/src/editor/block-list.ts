import type { NightfireBlock } from "../types";
import { generateNightfireBlockId } from "../block-ids";

export function createDefaultBlock(defaultType: string): NightfireBlock {
  return {
    id: generateNightfireBlockId(),
    type: defaultType,
    version: "initial",
    data: {}
  };
}

export function addBlockToList(blocks: Array<unknown>, defaultType: string): Array<unknown> {
  return blocks.concat(createDefaultBlock(defaultType));
}

export function insertBlockIntoList(
  blocks: Array<unknown>,
  index: number,
  defaultType: string
): Array<unknown> {
  const next = blocks.slice();
  next.splice(index + 1, 0, createDefaultBlock(defaultType));
  return next;
}
