<script lang="ts">
  import { TextInput } from "@inflatable-cookie/poodle-svelte";
  import { getBlockTypeOptionsForSchema, isBlockContentEmpty } from "../editor-registry";
  import { createDefaultBlock } from "../editor/block-list";
  import type { GroupedOptions } from "../editor/grouped-options";
  import { default as NightfireMultiBlockItem } from "../editor/NightfireMultiBlockItem.svelte";
  import type { NightfireBlockDefinition, NightfireTypeOption } from "../utils";

  type RecordValue = Record<string, unknown>;
  type ChildBlock = RecordValue & { type?: string; version?: string; data?: RecordValue };
  type Item = RecordValue & { title?: unknown; body?: unknown };
  type ItemListBlock = RecordValue & {
    type?: string;
    version?: string;
    data?: RecordValue & { title?: unknown; items?: unknown[] };
  };

  interface Props {
    block: ItemListBlock;
    value?: { schema?: string };
    onChange?: (block: ItemListBlock) => void;
  }

  let { block, value, onChange = () => {} }: Props = $props();

  let confirmation = $state<number | null>(null);

  const editorSchema = $derived(typeof value?.schema === "string" ? value.schema : "");
  const editorTypeOptions = $derived<NightfireTypeOption[]>(
    getBlockTypeOptionsForSchema(editorSchema).map((option) => ({
      type: option.type,
      label: option.label,
    })),
  );
  const effectiveDef = $derived<NightfireBlockDefinition>({
    schema: editorSchema,
    mode: "multi",
    defaultType: editorTypeOptions[0]?.type ?? "markdown",
  });
  const groupedOptions: GroupedOptions[] | null = null;

  const items = $derived(readItems(block));

  function readItems(source: ItemListBlock): Item[] {
    return Array.isArray(source?.data?.items) ? (source.data.items as Item[]) : [];
  }

  function readData(source: ItemListBlock): RecordValue {
    return source?.data !== null && typeof source?.data === "object" && !Array.isArray(source.data)
      ? source.data
      : {};
  }

  function itemBlocks(item: Item): ChildBlock[] {
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

  function updateItems(nextItems: Item[]): void {
    emitData({ ...readData(block), items: nextItems });
  }

  function setListTitle(title: string): void {
    const data = { ...readData(block) };
    if (title.trim().length > 0) data.title = title;
    else delete data.title;
    emitData(data);
  }

  function setItemTitle(index: number, title: string): void {
    const nextItems = items.slice();
    const item = nextItems[index];
    if (!item) return;

    const nextItem = { ...item };
    if (title.trim().length > 0) nextItem.title = title;
    else delete nextItem.title;
    nextItems[index] = nextItem;
    updateItems(nextItems);
  }

  function addItem(): void {
    updateItems([...items, { body: [] }]);
  }

  function requestRemoveItem(index: number): void {
    if (itemHasContent(items[index])) confirmation = index;
    else removeItem(index);
  }

  function itemHasContent(item: Item | undefined): boolean {
    if (!item) return false;
    if (typeof item.title === "string" && item.title.trim().length > 0) return true;
    return itemBlocks(item).some((child) => !isBlockContentEmpty(child));
  }

  function removeItem(index: number): void {
    if (index < 0 || index >= items.length) return;
    updateItems(items.filter((_item, itemIndex) => itemIndex !== index));
    confirmation = null;
  }

  function moveItem(from: number, to: number): void {
    if (from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const nextItems = items.slice();
    const [moved] = nextItems.splice(from, 1);
    if (!moved) return;
    nextItems.splice(to, 0, moved);
    updateItems(nextItems);
  }

  function setItemBlocks(index: number, blocks: ChildBlock[]): void {
    const nextItems = items.slice();
    const item = nextItems[index];
    if (!item) return;
    nextItems[index] = { ...item, body: blocks };
    updateItems(nextItems);
  }

  function addChildBlock(itemIndex: number): void {
    const item = items[itemIndex];
    if (!item) return;
    const nextBlock = createDefaultBlock(effectiveDef.defaultType) as ChildBlock;
    setItemBlocks(itemIndex, [...itemBlocks(item), nextBlock]);
  }

  function changeChildType(itemIndex: number, blockIndex: number, nextType: string): void {
    const children = itemBlocks(items[itemIndex]);
    const current = children[blockIndex];
    if (!current) return;
    const nextChildren = children.slice();
    nextChildren[blockIndex] = { ...current, type: nextType };
    setItemBlocks(itemIndex, nextChildren);
  }

  function changeChildBlock(itemIndex: number, blockIndex: number, nextBlock: ChildBlock): void {
    const children = itemBlocks(items[itemIndex]);
    const current = children[blockIndex];
    if (!current) return;

    const nextChildren = children.slice();
    nextChildren[blockIndex] =
      typeof current.id === "string" && typeof nextBlock.id !== "string"
        ? { ...nextBlock, id: current.id }
        : nextBlock;
    setItemBlocks(itemIndex, nextChildren);
  }

  function removeChildBlock(itemIndex: number, blockIndex: number): void {
    setItemBlocks(
      itemIndex,
      itemBlocks(items[itemIndex]).filter((_child, childIndex) => childIndex !== blockIndex),
    );
  }

  function moveChildBlock(itemIndex: number, from: number, to: number): void {
    const children = itemBlocks(items[itemIndex]);
    if (from < 0 || to < 0 || from >= children.length || to >= children.length) return;
    const nextChildren = children.slice();
    const [moved] = nextChildren.splice(from, 1);
    if (!moved) return;
    nextChildren.splice(to, 0, moved);
    setItemBlocks(itemIndex, nextChildren);
  }

  function handleKeyboardAction(event: KeyboardEvent, action: () => void): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  }
</script>

<div class="underlay-nightfire-field underlay-item-list-editor" data-item-list-editor>
  <TextInput
    ariaLabel="Item list title (optional)"
    placeholder="List title (optional)"
    value={typeof block?.data?.title === "string" ? block.data.title : ""}
    onValueChange={setListTitle}
  />

  {#if items.length === 0}
    <div class="underlay-nightfire-field__empty" data-item-list-empty>
      <button
        type="button"
        class="underlay-nightfire-field__multi-add"
        aria-label="Add item"
        onclick={addItem}
        onkeydown={(event) => handleKeyboardAction(event, addItem)}
      >
        + Add item
      </button>
    </div>
  {:else}
    <div class="underlay-item-list-editor__items" aria-label="Item list items">
      {#each items as item, index (index)}
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
                aria-label={`Move item ${index + 1} up`}
                disabled={index === 0}
                onclick={() => moveItem(index, index - 1)}
                onkeydown={(event) => handleKeyboardAction(event, () => moveItem(index, index - 1))}
              >
                Move up
              </button>
              <button
                type="button"
                aria-label={`Move item ${index + 1} down`}
                disabled={index === items.length - 1}
                onclick={() => moveItem(index, index + 1)}
                onkeydown={(event) => handleKeyboardAction(event, () => moveItem(index, index + 1))}
              >
                Move down
              </button>
              <button
                type="button"
                aria-label={`Remove item ${index + 1}`}
                onclick={() => requestRemoveItem(index)}
                onkeydown={(event) => handleKeyboardAction(event, () => requestRemoveItem(index))}
              >
                Remove item
              </button>
            </div>
          </div>

          <div class="underlay-item-list-editor__body" aria-label={`Item ${index + 1} blocks`}>
            {#each children as child, childIndex (`${child.id ?? "child"}-${childIndex}`)}
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
              class="underlay-nightfire-field__multi-add"
              aria-label={`Add child block to item ${index + 1}`}
              onclick={() => addChildBlock(index)}
              onkeydown={(event) => handleKeyboardAction(event, () => addChildBlock(index))}
            >
              + Add child block
            </button>
          </div>
        </section>
      {/each}
    </div>

    <button
      type="button"
      class="underlay-nightfire-field__multi-add"
      aria-label="Add item"
      onclick={addItem}
      onkeydown={(event) => handleKeyboardAction(event, addItem)}
    >
      + Add item
    </button>
  {/if}

  {#if confirmation !== null}
    <div
      class="underlay-item-list-editor__confirmation"
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="nightfire-item-list-confirmation-title"
    >
      <p id="nightfire-item-list-confirmation-title">
        Remove item {confirmation + 1}? It contains content and cannot be undone.
      </p>
      <div>
        <button type="button" onclick={() => (confirmation = null)}>Cancel</button>
        <button type="button" onclick={() => removeItem(confirmation!)}>Confirm removal</button>
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
