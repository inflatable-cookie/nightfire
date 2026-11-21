<script lang="ts">
  import { TextInput } from "@inflatable-cookie/poodle-svelte";
  import { createStableId } from "../dom";
  import { getBlockTypeOptionsForSchema, isBlockContentEmpty } from "../editor-registry";
  import { createDefaultBlock } from "../editor/block-list";
  import type { GroupedOptions } from "../editor/grouped-options";
  import { default as NightfireMultiBlockItem } from "../editor/NightfireMultiBlockItem.svelte";
  import { changeBlockType } from "../editor/value-updates";
  import type { BlockTypeOption, SchemaDefinition } from "../editor-registry";

  type RecordValue = Record<string, unknown>;
  type ChildBlock = RecordValue & { id?: string; type?: string; version?: string; data?: RecordValue };
  type Item = RecordValue & { title?: unknown; body?: unknown };
  type ItemListBlock = RecordValue & {
    type?: string;
    version?: string;
    data?: RecordValue & { title?: unknown; items?: Array<unknown> };
  };

  interface Props {
    block: ItemListBlock;
    value?: { schema?: string };
    onChange?: (block: ItemListBlock) => void;
  }

  let { block, value, onChange = () => {} }: Props = $props();

  const confirmationTitleId = createStableId("nightfire-item-list-confirmation-title");
  let confirmation = $state<number | null>(null);

  const editorSchema = $derived(typeof value?.schema === "string" ? value.schema : "");
  const editorTypeOptions = $derived<Array<BlockTypeOption>>(
    getBlockTypeOptionsForSchema(editorSchema).map((option) => ({
      type: option.type,
      label: option.label,
    })),
  );
  const effectiveDef = $derived<SchemaDefinition>({
    schema: editorSchema,
    mode: "multi",
    defaultType: editorTypeOptions[0]?.type ?? "markdown",
  });
  const groupedOptions: Array<GroupedOptions> | null = null;

  const items = $derived(readItems(block));

  // A pending removal belongs to the list as it was: when the list shrinks
  // underneath it through an external edit, the dialog drops instead of
  // pointing at an item that no longer exists.
  $effect(() => {
    if (confirmation !== null && confirmation >= items.length) {confirmation = null;}
  });

  // Stable outer keys, reconciled per render: an identical reference keeps
  // its key (reorder and removal survivors stay mounted), while an entry
  // edited in place arrives as a fresh object at the same index and reuses
  // the key carried there. In-place edits spread-copy the item on every
  // keystroke, so identity alone would remount the section under the
  // author's cursor. Non-object entries carry no child editors and keep
  // positional keys. Re-running with the same array is idempotent: known
  // references hit the map and carried keys line up by index.
  const itemKeyByRef = new WeakMap<object, string>();
  let itemKeysByIndex: Array<string> = [];
  let nextItemKey = 0;
  const keyedItems = $derived(keyOuterItems(items));
  function keyOuterItems(current: Array<Item>): Array<{ item: Item; key: string }> {
    const keys = new Array<string>(current.length);
    const taken = new Set<string>();
    const claim = (at: number, key: string): void => {
      keys[at] = key;
      taken.add(key);
    };
    current.forEach((item, at) => {
      if (item === null || typeof item !== "object") {return;}
      const known = itemKeyByRef.get(item);
      if (known !== undefined && !taken.has(known)) {claim(at, known);}
    });
    current.forEach((item, at) => {
      if (keys[at] !== undefined) {return;}
      if (item === null || typeof item !== "object") {
        claim(at, `index:${at}`);
        return;
      }
      const carried = itemKeysByIndex[at];
      if (carried !== undefined && !taken.has(carried)) {
        itemKeyByRef.set(item, carried);
        claim(at, carried);
        return;
      }
      let minted: string;
      do {
        nextItemKey += 1;
        minted = `item:${nextItemKey}`;
      } while (taken.has(minted));
      itemKeyByRef.set(item, minted);
      claim(at, minted);
    });
    itemKeysByIndex = keys.slice();
    return current.map((item, at) => ({ item, key: keys[at] as string }));
  }

  function readItems(source: ItemListBlock): Array<Item> {
    return Array.isArray(source?.data?.items) ? (source.data.items as Array<Item>) : [];
  }

  function readData(source: ItemListBlock): RecordValue {
    return source?.data !== null && typeof source?.data === "object" && !Array.isArray(source.data)
      ? source.data
      : {};
  }

  function itemBlocks(item: Item): Array<ChildBlock> {
    if (Array.isArray(item?.body)) {
      return item.body.filter(isChildBlock);
    }
    return isChildBlock(item?.body) ? [item.body] : [];
  }

  function isChildBlock(value: unknown): value is ChildBlock {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as { type?: unknown }).type === "string"
    );
  }

  function emitData(data: RecordValue): void {
    const source = block !== null && typeof block === "object" ? block : {};
    onChange({
      ...source,
      type: typeof source.type === "string" ? source.type : "item_list",
      version: typeof source.version === "string" ? source.version : "initial",
      data,
    });
  }

  function updateItems(nextItems: Array<Item>): void {
    confirmation = null;
    emitData({ ...readData(block), items: nextItems });
  }

  function setListTitle(title: string): void {
    // A pending removal belongs to the list as it was; editing the list title
    // is a new state, so the confirmation drops the way it does in
    // `setItemTitle`.
    confirmation = null;
    // `items` is always written: an empty block has none yet, and the saved
    // payload must still carry the list the schema requires.
    const data: RecordValue = { ...readData(block), items };
    if (title.trim().length > 0) {data.title = title;}
    else {delete data.title;}
    emitData(data);
  }

  function setItemTitle(index: number, title: string): void {
    const nextItems = items.slice();
    const item = nextItems[index];
    if (!item) {return;}

    const nextItem = { ...item };
    if (title.trim().length > 0) {nextItem.title = title;}
    else {delete nextItem.title;}
    nextItems[index] = nextItem;
    updateItems(nextItems);
  }

  function addItem(): void {
    updateItems([...items, { body: [] }]);
  }

  function requestRemoveItem(index: number): void {
    if (itemHasContent(items[index])) {confirmation = index;}
    else {removeItem(index);}
  }

  function itemHasContent(item: Item | undefined): boolean {
    if (!item) {return false;}
    if (typeof item.title === "string" && item.title.trim().length > 0) {return true;}
    return itemBlocks(item).some((child) => !isBlockContentEmpty(child));
  }

  function removeItem(index: number): void {
    confirmation = null;
    if (index < 0 || index >= items.length) {return;}
    updateItems(items.filter((_item, itemIndex) => itemIndex !== index));
  }

  function moveItem(from: number, to: number): void {
    if (from < 0 || to < 0 || from >= items.length || to >= items.length) {return;}
    const nextItems = items.slice();
    const [moved] = nextItems.splice(from, 1);
    if (!moved) {return;}
    nextItems.splice(to, 0, moved);
    updateItems(nextItems);
  }

  function setItemBlocks(index: number, blocks: Array<ChildBlock>): void {
    const nextItems = items.slice();
    const item = nextItems[index];
    if (!item) {return;}
    nextItems[index] = { ...item, body: blocks };
    updateItems(nextItems);
  }

  function addChildBlock(itemIndex: number): void {
    const item = items[itemIndex];
    if (!item) {return;}
    const nextBlock = createDefaultBlock(effectiveDef.defaultType) as ChildBlock;
    setItemBlocks(itemIndex, [...itemBlocks(item), nextBlock]);
  }

  function changeChildType(itemIndex: number, blockIndex: number, nextType: string): void {
    const item = items[itemIndex];
    if (!item) {return;}
    const children = itemBlocks(item);
    const current = children[blockIndex];
    if (!current) {return;}
    const nextChildren = children.slice();
    nextChildren[blockIndex] = changeBlockType(current, nextType) as ChildBlock;
    setItemBlocks(itemIndex, nextChildren);
  }

  function changeChildBlock(itemIndex: number, blockIndex: number, nextBlock: ChildBlock): void {
    const item = items[itemIndex];
    if (!item) {return;}
    const children = itemBlocks(item);
    const current = children[blockIndex];
    if (!current) {return;}

    const nextChildren = children.slice();
    nextChildren[blockIndex] =
      typeof current.id === "string" && typeof nextBlock.id !== "string"
        ? { ...nextBlock, id: current.id }
        : nextBlock;
    setItemBlocks(itemIndex, nextChildren);
  }

  function removeChildBlock(itemIndex: number, blockIndex: number): void {
    const item = items[itemIndex];
    if (!item) {return;}
    setItemBlocks(
      itemIndex,
      itemBlocks(item).filter((_child, childIndex) => childIndex !== blockIndex),
    );
  }

  function moveChildBlock(itemIndex: number, from: number, to: number): void {
    const item = items[itemIndex];
    if (!item) {return;}
    const children = itemBlocks(item);
    if (from < 0 || to < 0 || from >= children.length || to >= children.length) {return;}
    const nextChildren = children.slice();
    const [moved] = nextChildren.splice(from, 1);
    if (!moved) {return;}
    nextChildren.splice(to, 0, moved);
    setItemBlocks(itemIndex, nextChildren);
  }

  // A child id keys its editor, so a sibling move or removal leaves the other
  // editors mounted. Stored data can repeat an id, and a keyed block rejects a
  // duplicate key, so a repeated id falls back to the child's position.
  function childKey(children: Array<ChildBlock>, index: number): string | number {
    const id = children[index]?.id;
    if (typeof id !== "string" || id.trim().length === 0) {return `index:${index}`;}
    const duplicated = children.some((child, other) => other !== index && child.id === id);
    return duplicated ? `index:${index}` : id;
  }
</script>

<div class="underlay-item-list-editor" data-item-list-editor>
  <TextInput
    ariaLabel="Item list title (optional)"
    placeholder="List title (optional)"
    value={typeof block?.data?.title === "string" ? block.data.title : ""}
    onValueChange={setListTitle}
  />

  {#if items.length === 0}
    <div class="underlay-item-list-editor__empty" data-item-list-empty>
      <button
        type="button"
        class="underlay-item-list-editor__button underlay-item-list-editor__add"
        aria-label="Add item"
        onclick={addItem}
      >
        + Add item
      </button>
    </div>
  {:else}
    <div class="underlay-item-list-editor__items" aria-label="Item list items">
      {#each keyedItems as keyed, index (keyed.key)}
        {@const item = keyed.item}
        {@const children = itemBlocks(item)}
        <section class="underlay-item-list-editor__item" data-item-list-item data-item-index={index}>
          <div class="underlay-item-list-editor__toolbar">
            <TextInput
              ariaLabel={`Item ${index + 1} title (optional)`}
              placeholder="Item title (optional)"
              value={typeof item.title === "string" ? item.title : ""}
              onValueChange={(title) => setItemTitle(index, title)}
            />
            <div class="underlay-item-list-editor__controls" aria-label={`Item ${index + 1} controls`}>
              <button
                type="button"
                class="underlay-item-list-editor__button"
                aria-label={`Move item ${index + 1} up`}
                disabled={index === 0}
                onclick={() => moveItem(index, index - 1)}
              >
                Move up
              </button>
              <button
                type="button"
                class="underlay-item-list-editor__button"
                aria-label={`Move item ${index + 1} down`}
                disabled={index === items.length - 1}
                onclick={() => moveItem(index, index + 1)}
              >
                Move down
              </button>
              <button
                type="button"
                class="underlay-item-list-editor__button"
                aria-label={`Remove item ${index + 1}`}
                onclick={() => requestRemoveItem(index)}
              >
                Remove item
              </button>
            </div>
          </div>

          <div class="underlay-item-list-editor__body" aria-label={`Item ${index + 1} blocks`}>
            <!-- A child block keeps its editor while its id does, so a sibling
                 move or removal does not remount unchanged children. -->
            {#each children as child, childIndex (childKey(children, childIndex))}
              <NightfireMultiBlockItem
                block={child}
                index={childIndex}
                totalBlocks={children.length}
                editorSchema={editorSchema}
                effectiveDef={effectiveDef}
                editorTypeOptions={editorTypeOptions}
                {groupedOptions}
                onTypeChange={(nextIndex, nextType) => changeChildType(index, nextIndex, nextType)}
                onMove={(from, to) => moveChildBlock(index, from, to)}
                onRemove={(childIndexToRemove) => removeChildBlock(index, childIndexToRemove)}
                onBlockChange={(nextIndex, nextBlock) => changeChildBlock(index, nextIndex, nextBlock)}
              />
            {/each}
            <button
              type="button"
              class="underlay-item-list-editor__button underlay-item-list-editor__add"
              aria-label={`Add child block to item ${index + 1}`}
              onclick={() => addChildBlock(index)}
            >
              + Add child block
            </button>
          </div>
        </section>
      {/each}
    </div>

    <button
      type="button"
      class="underlay-item-list-editor__button underlay-item-list-editor__add"
      aria-label="Add item"
      onclick={addItem}
    >
      + Add item
    </button>
  {/if}

  {#if confirmation !== null}
    <div
      class="underlay-item-list-editor__confirmation"
      role="alertdialog"
      aria-modal="false"
      aria-labelledby={confirmationTitleId}
    >
      <p id={confirmationTitleId}>
        Remove item {confirmation + 1}? It contains content and cannot be undone.
      </p>
      <div>
        <button type="button" class="underlay-item-list-editor__button" onclick={() => (confirmation = null)}>
          Cancel
        </button>
        <button type="button" class="underlay-item-list-editor__button" onclick={() => removeItem(confirmation!)}>
          Confirm removal
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .underlay-item-list-editor {
    display: grid;
    gap: var(--nightfire-space-3);
  }

  .underlay-item-list-editor__items {
    display: grid;
    gap: var(--nightfire-space-3);
  }

  .underlay-item-list-editor__item {
    display: grid;
    gap: var(--nightfire-space-2);
    padding: var(--nightfire-space-3);
    border: 1px solid var(--nightfire-color-border-subtle);
    border-radius: var(--nightfire-radius-control);
  }

  .underlay-item-list-editor__toolbar {
    display: grid;
    gap: var(--nightfire-space-2);
  }

  .underlay-item-list-editor__controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--nightfire-space-1);
  }

  .underlay-item-list-editor__body {
    display: grid;
    gap: var(--nightfire-space-2);
  }

  .underlay-item-list-editor__empty {
    display: flex;
    justify-content: flex-start;
  }

  .underlay-item-list-editor__button {
    font-size: calc(1em * var(--nightfire-font-scale-xxs));
    padding: var(--nightfire-button-chip-padding-block)
      var(--nightfire-button-chip-padding-inline);
    border-radius: var(--nightfire-radius-pill);
    border: 1px solid var(--nightfire-color-border-subtle);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .underlay-item-list-editor__button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .underlay-item-list-editor__add {
    justify-self: start;
    border-color: var(--nightfire-color-border-strong);
  }

  .underlay-item-list-editor__confirmation {
    display: grid;
    gap: var(--nightfire-space-2);
    padding: var(--nightfire-space-3);
    border: 1px solid var(--nightfire-color-danger);
  }

  .underlay-item-list-editor__confirmation p {
    margin: 0;
  }

  .underlay-item-list-editor__confirmation div {
    display: flex;
    gap: var(--nightfire-space-2);
  }
</style>
