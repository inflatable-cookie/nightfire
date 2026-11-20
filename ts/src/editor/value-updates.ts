import {
  coerceNightfireBlock,
  type NightfireBlock,
  type NightfireValue
} from "../types";
import { addBlockToList, insertBlockIntoList } from "./block-list";

function asBlockObject(value: unknown): NightfireBlock {
  // These helpers edit a block, so absent or malformed input still needs a
  // block to edit. `coerceNightfireBlock` refuses to fabricate one by itself.
  return (
    coerceNightfireBlock(value, "markdown") ?? {
      type: "markdown",
      version: "initial",
      data: {}
    }
  );
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

/**
 * A type change keeps the block's identity and nothing else. `data` and
 * `version` belonged to the type being left, so they reset rather than carry
 * over into a type whose schema may reject them.
 */
export function changeBlockType(currentBlock: unknown, nextType: string): NightfireBlock {
  const current = asBlockObject(currentBlock);
  return {
    ...(current.id ? { id: current.id } : {}),
    type: nextType,
    version: "initial",
    data: {}
  };
}

export function addBlock(blocks: unknown[], defaultType: string): unknown[] {
  return addBlockToList(blocks, defaultType);
}

export function insertBlockAfter(blocks: unknown[], index: number, defaultType: string): unknown[] {
  return insertBlockIntoList(blocks, index, defaultType);
}
