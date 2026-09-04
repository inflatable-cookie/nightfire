import {
  coerceNightfireBlock,
  type NightfireBlock,
  type NightfireValue
} from "../types";
import {
  addBlockToList,
  insertBlockIntoList,
  moveBlockInList,
  removeBlockFromList
} from "./block-list";
function asBlockObject(value: unknown): NightfireBlock {
  return coerceNightfireBlock(value, "markdown")!;
}

export function asSingleBlockValue(schema: string, block: unknown): NightfireValue {
  return {
    schema,
    blocks: [asBlockObject(block)]
  };
}

export function asMultiBlockValue(schema: string, blocks: unknown[]): NightfireValue {
  return {
    schema,
    blocks: blocks.map((block) => asBlockObject(block))
  };
}

export function replaceBlockAtIndex(blocks: unknown[], index: number, nextBlock: unknown): unknown[] {
  const nextBlocks = blocks.slice();
  nextBlocks[index] = asBlockObject(nextBlock);
  return nextBlocks;
}

export function changeSingleBlockType(
  _schema: string,
  currentBlock: unknown,
  nextType: string,
  _getLabelForType: (type: string) => string
): { block: NightfireBlock; warning: string | null } {
  const current = asBlockObject(currentBlock);
  return {
    block: { ...current, type: nextType },
    warning: null
  };
}

export function changeBlockType(currentBlock: unknown, nextType: string): NightfireBlock {
  return {
    ...asBlockObject(currentBlock),
    type: nextType
  };
}

export function addBlock(blocks: unknown[], defaultType: string): unknown[] {
  return addBlockToList(blocks, defaultType);
}

export function insertBlockAfter(blocks: unknown[], index: number, defaultType: string): unknown[] {
  return insertBlockIntoList(blocks, index, defaultType);
}

export function removeBlock(blocks: unknown[], index: number): unknown[] {
  return removeBlockFromList(blocks, index);
}

export function moveBlock(blocks: unknown[], from: number, to: number): unknown[] | null {
  return moveBlockInList(blocks, from, to);
}
