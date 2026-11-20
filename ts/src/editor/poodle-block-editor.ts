import type { BlockTypeDefinition, BlockTypeGroup } from "@inflatable-cookie/poodle-svelte";

import type { BlockTypeOption } from "../editor-registry";
import type { GroupedOptions, NightfireBlockOptionInput } from "./grouped-options";

/**
 * Shape adapters between Nightfire's block model and Poodle's `BlockEditor`
 * props. Poodle's component API is consumed directly - these only reshape
 * Nightfire data into what it already accepts.
 */

const DEFAULT_BLOCK_ICON = "file-text";

export type NightfireEditorBlock = Record<string, unknown> & {
  id?: string;
  type: string;
  version?: string | number;
  hash?: string | null;
  data?: Record<string, unknown>;
  content?: string;
};

export type ToEditorBlocksOptions = {
  fallbackType: string;
  /**
   * Prefix for the id of a block that has none yet. Pass a value minted once
   * per editor instance, so ids stay unique across editors on one page.
   */
  fallbackIdPrefix: string;
};

/**
 * Poodle requires a stable `id` and a concrete `type` on every block.
 *
 * Stored blocks get their ids when the editor takes a value, so the fallback
 * only covers a block that has none yet. It is positional, not random: a fresh
 * id on every derivation would remount the block on each keystroke.
 */
export function toEditorBlocks(
  blocks: Array<NightfireEditorBlock>,
  options: ToEditorBlocksOptions
): Array<NightfireEditorBlock & { id: string; type: string }> {
  return blocks.map((block, index) => ({
    ...block,
    id:
      typeof block.id === "string" && block.id.length > 0
        ? block.id
        : `${options.fallbackIdPrefix}-${index}`,
    type:
      typeof block.type === "string" && block.type.length > 0 ? block.type : options.fallbackType
  }));
}

export function toBlockTypes(
  options: Array<BlockTypeOption | NightfireBlockOptionInput>
): Array<BlockTypeDefinition> {
  return options.map((option) => ({
    type: option.type,
    label: option.label,
    icon: DEFAULT_BLOCK_ICON
  })) as Array<BlockTypeDefinition>;
}

/**
 * Poodle groups its type picker when given `BlockTypeGroup[]`; Nightfire only
 * has groups to give when the caller supplied them.
 */
export function toBlockTypeGroups(groups: Array<GroupedOptions>): Array<BlockTypeGroup> {
  return groups.map((group) => ({
    label: group.label,
    options: toBlockTypes(group.options)
  })) as Array<BlockTypeGroup>;
}
