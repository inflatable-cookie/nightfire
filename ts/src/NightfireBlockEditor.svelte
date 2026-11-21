<script lang="ts">
  import type { MarkdownEditorContext } from "./markup/markdown-editor-context";
  import { getBlockEditor } from "./editor-registry";
  import "./editor-registrations";
  import type { BlockTypeOption, SchemaDefinition } from "./editor-registry";
  import { normaliseNightfireBlock } from "./utils";

  /**
   * Single-block Nightfire editor.
   *
   * This component edits a single block for a given schema. It:
   * - Renders the appropriate block editor for the current type.
   * - Emits the updated block via `onChange` whenever it changes.
   *
   * It does not know about NightfireValue, single vs multi fields, or form
   * serialisation; those concerns live in the field-level Nightfire editor,
   * which is responsible for type selection and cardinality.
   */

  interface Props {
    schema: string;
    block: any;
    /**
     * Optional callback invoked whenever the block changes.
     */
    onChange?: (block: any) => void;
    /**
     * Pre-resolved schema definition and type options, so this component does not
     * repeat the caller's registry lookup. The block editor itself is resolved
     * from the registry by schema and current type.
     */
    definition: SchemaDefinition;
    typeOptions: Array<BlockTypeOption>;
    onContextChange?: ((context: MarkdownEditorContext) => void) | null;
  }

  let {
    schema,
    block,
    onChange = () => {},
    definition,
    typeOptions,
    onContextChange = null
  }: Props = $props();

  // Normalize the block and derive values reactively
  // This ensures child editors always receive the latest data
  const normalisedBlock = $derived(normaliseNightfireBlock(block, typeOptions, definition));
  const currentBlockType = $derived(normalisedBlock.type);
  const BlockEditor = $derived(getBlockEditor(schema, currentBlockType));

  // A block a caller passes without an id mints one on its first edit. That is
  // the same block, so the editor only restarts when the type changes or when
  // two distinct real ids are swapped: a first id, or a removed one, is not a
  // new block.
  let mountedId: string | null = null;
  let restarts = 0;
  function editorKey(): string {
    const id = typeof block?.id === "string" && block.id.trim().length > 0 ? block.id : null;
    if (id !== null && mountedId === null) {
      mountedId = id;
    } else if (id !== null && id !== mountedId) {
      mountedId = id;
      restarts += 1;
    }

    return `${restarts}:${currentBlockType}`;
  }

  function handleBlockEditorChange(next: any) {
    const candidate = next && typeof next === "object" && "block" in next
      ? (next as { block?: any }).block
      : next;
    const normalised = normaliseNightfireBlock(candidate, typeOptions, definition);
    onChange?.(normalised);
  }
</script>

<div class="underlay-nightfire-editor underlay-nightfire-editor--single">
  {#if BlockEditor}
    {#key editorKey()}
      {@const EditorComponent = BlockEditor}
      <EditorComponent
        block={normalisedBlock}
        value={{ schema, blocks: [normalisedBlock] }}
        onChange={handleBlockEditorChange}
        {onContextChange}
      />
    {/key}
  {:else}
    <p>
      No editor found for type
      <code>{currentBlockType}</code>. Register a matching editor to edit this
      value.
    </p>
  {/if}
</div>

<style>
  .underlay-nightfire-editor {
    display: grid;
    gap: var(--nightfire-density-gap);
  }
</style>
