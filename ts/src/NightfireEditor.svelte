<script lang="ts">
  import { tick, untrack } from "svelte";
  import type { MarkdownEditorContext } from "./markup/markdown-editor-context";
  import type { NightfireValue } from "./types";
  import type { SchemaMismatchInfo } from "./editor";
  // Ensure registrations are loaded before we lookup schema definitions
  import "./editor-registrations";
  import {
    getBlockTypeOptionsForSchema
  } from "./editor-registry";
  import {
    isEmptyNightfire
  } from "./utils";
  import { ensureNightfireBlockIds } from "./block-ids";
  import { useNightfireStrategies } from './strategies';
import type { NightfireStrategy } from './strategies';
  import { buildGroupedOptions } from './editor/grouped-options';
import type { NightfireBlockOptionInput } from './editor/grouped-options';
  import { resolveSchemaDefinition } from "./editor/schema-resolution";
  import { createPrepareWriter, createRequiredInitialValue } from './editor/field-lifecycle';
import type { NightfireFieldMode } from './editor/field-lifecycle';
  import { default as NightfireFieldBlockShell } from "./editor/NightfireFieldBlockShell.svelte";
  import { normaliseForStrategy } from "./editor/strategy-normalisation";
  import {
    addBlock as addEditorBlock,
    asMultiBlockValue,
    asSingleBlockValue,
    changeBlockType,
    insertBlockAfter,
    replaceBlockAtIndex
  } from "./editor/value-updates";
  import { buildNightfireSlashCommands, filterNightfireSlashCommands, findNightfireSlashMatch, removeNightfireSlashText } from './slash-commands';
import type { NightfireSlashCommand, NightfireSlashCommandsConfig } from './slash-commands';

  /**
   * Field-level Nightfire editor.
   *
   * - Owns the NightfireValue (single or multi) for a given schema.
   * - Delegates single-block editing to NightfireBlockEditor.
   * - Provides an optional `prepare` hook so forms can serialise the
   *   current value into FormData just before submit.
   * - Automatically loads and applies Nightfire strategies when configured.
   * - Handles value normalisation internally.
   */

  interface Props {
    name: string;
    schema: string;
    value: NightfireValue;
    /**
     * Optional overrides derived from a Nightfire strategy.
     * @deprecated Use automatic strategy loading via configureNightfireStrategies() instead.
     *
     * - `modeOverride` lets the host control single vs multi editing
     *   based on strategy cardinality.
     * - `defaultTypeOverride` lets the host control which block type
     *   is used for new blocks.
     * - `blockOptions` provides a flat list of available blocks. Options
     *   with a `category` are grouped by `buildGroupedOptions`.
     *
     * When these are not provided, the editor falls back to the
     * local registry definitions so it remains usable without a
     * strategy API or in tests.
     */
    modeOverride?: NightfireFieldMode | null;
    defaultTypeOverride?: string | null;
    blockOptions?: Array<NightfireBlockOptionInput> | null;
    /**
     * Whether this Nightfire field is required from the UI's
     * perspective. When true and the value is empty, a simple
     * client-side validation message is shown.
     */
    required?: boolean;
    /**
     * Optional callback invoked whenever the NightfireValue changes.
     */
    onChange?: (value: NightfireValue) => void;
    /**
     * Hook used with a parent form's `prepare` boundary. When bound from a parent
     * (via `bind:prepare`), the editor will populate it with an
     * implementation that writes the current Nightfire value into
     * `FormData[name]` just before submit.
     */
    prepare?: (formData: FormData) => void;
    /**
     * Callback invoked when a schema mismatch is detected during normalisation.
     * This allows the parent to display a warning to the user.
     */
    onSchemaMismatch?: (info: SchemaMismatchInfo) => void;
    slashCommands?: NightfireSlashCommandsConfig | null;
  }

  let {
    name,
    schema,
    value = $bindable(),
    modeOverride = null,
    defaultTypeOverride = null,
    blockOptions = null,
    required = false,
    onChange = () => {},
    prepare = $bindable(() => {}),
    onSchemaMismatch,
    slashCommands = null
  }: Props = $props();

  // Strategy loading. The strategy follows the `schema` prop. A response that
  // arrives after the prop has moved on is dropped, and a failed fetch leaves
  // the registry defaults in place.
  const strategiesStore = useNightfireStrategies();
  let strategy = $state<NightfireStrategy | null>(null);
  let lastSchemaMismatchReported = $state<string | null>(null);

  $effect(() => {
    const requestedSchema = schema;
    strategy = null;
    if (!strategiesStore) {
      return;
    }

    let superseded = false;
    strategiesStore
      .ensure()
      .then(() => {
        if (!superseded) {
          strategy = strategiesStore.findById(requestedSchema);
        }
      })
      .catch(() => {
        if (!superseded) {
          strategy = null;
        }
      });

    return () => {
      superseded = true;
    };
  });

  // Derive effective overrides from strategy (if no manual overrides provided)
  const effectiveModeOverride = $derived(
    modeOverride ?? strategy?.cardinality.mode ?? null
  );
  const effectiveDefaultTypeOverride = $derived(
    defaultTypeOverride ?? strategy?.defaultType ?? null
  );
  const effectiveBlockOptions = $derived(
    blockOptions ?? (strategy?.blockOptions as Array<NightfireBlockOptionInput> | null) ?? null
  );

  let hasInitialisedRequired = $state(false);

  // The registry entry for `schema` sets the mode and default type unless a
  // strategy or the caller overrides them. Block editors are looked up with
  // `schema` directly.
  const registryDef = $derived(resolveSchemaDefinition(schema));

  const effectiveDef = $derived({
    schema,
    mode: (effectiveModeOverride ?? registryDef.mode) as NightfireFieldMode,
    defaultType: effectiveDefaultTypeOverride ?? registryDef.defaultType
  });

  // Keep the stored value shaped as the editor expects. This matters for
  // schemas without a registry entry, which may still receive single-block
  // payloads from the API. Every stored block gets its id here, outside any
  // derived state, so the block list keeps the same ids across keystrokes.
  $effect(() => {
    const { coerced, schemaMismatch } = normaliseForStrategy(value, schema);

    if (schemaMismatch && schemaMismatch !== lastSchemaMismatchReported) {
      lastSchemaMismatchReported = schemaMismatch;
      onSchemaMismatch?.({ actualSchema: schemaMismatch, expectedSchema: schema });
    }

    const next = ensureNightfireBlockIds(coerced);
    if (stableSnapshot(value) !== stableSnapshot(next)) {
      value = next;
    }
  });

  const baseTypeOptions = $derived(
    effectiveBlockOptions && effectiveBlockOptions.length > 0
      ? effectiveBlockOptions
      : getBlockTypeOptionsForSchema(schema)
  );

  const editorTypeOptions = $derived(
    baseTypeOptions.map((opt) => ({
      type: opt.type,
      label: opt.label
    }))
  );

  const groupedOptions = $derived(
    effectiveBlockOptions && effectiveBlockOptions.some((o) => !!o.category)
      ? buildGroupedOptions(effectiveBlockOptions)
      : null
  );

  const isMulti = $derived(effectiveDef.mode === "multi");
  const slashCommandsEnabled = $derived(Boolean(slashCommands?.enabled) && isMulti);
  const availableSlashCommands = $derived(
    slashCommandsEnabled
      ? buildNightfireSlashCommands(editorTypeOptions, slashCommands)
      : []
  );

  // Blocks array is the only stored shape. Single-mode editors use blocks[0].
  const blocks = $derived.by(() => {
    if (Array.isArray(value?.blocks)) {
      return value.blocks as Array<any>;
    }
    return [];
  });
  const singleBlock = $derived(isMulti ? null : (blocks[0] ?? null));
  let slashState = $state<{
    blockIndex: number;
    start: number;
    end: number;
    query: string;
  } | null>(null);
  const filteredSlashCommands = $derived(
    slashState
      ? filterNightfireSlashCommands(availableSlashCommands, slashState.query)
      : []
  );

  // Root of this editor's markup. Block focus is searched inside it, so two
  // editors on one page never reach into each other.
  let rootElement: HTMLDivElement | null = $state(null);

  function stableSnapshot(input: unknown): string {
    try {
      return JSON.stringify(input ?? null);
    } catch {
      return "[unserializable-nightfire]";
    }
  }

  $effect(() => {
    if (!slashCommandsEnabled && slashState) {
      closeSlashPalette();
    }
  });

  function emit(nextValue: NightfireValue) {
    value = nextValue;
    onChange?.(nextValue);
  }

  function handleSingleBlockChange(nextBlock: any) {
    emit(asSingleBlockValue(schema, nextBlock));
  }

  function handleBlockChange(index: number, nextBlock: any) {
    emit(asMultiBlockValue(schema, replaceBlockAtIndex(blocks, index, nextBlock)));
  }

  function handleSingleTypeChange(nextType: string) {
    handleSingleBlockChange(changeBlockType(singleBlock, nextType));
  }

  function handleTypeChange(index: number, nextType: string) {
    handleBlockChange(index, changeBlockType(blocks[index], nextType));
  }

  function addBlock() {
    const defaultType =
      effectiveDef.defaultType ?? editorTypeOptions[0]?.type ?? "markdown";
    emit(asMultiBlockValue(schema, addEditorBlock(blocks, defaultType)));
  }

  function closeSlashPalette() {
    slashState = null;
  }

  function hasCardAncestor(element: HTMLElement, root: HTMLElement): boolean {
    for (let node = element.parentElement; node && node !== root; node = node.parentElement) {
      if (node.hasAttribute("data-nightfire-block-card")) {
        return true;
      }
    }
    return false;
  }

  // Focus lands on this editor's own top-level card for the index. An item
  // list's child cards reuse the same attributes, so nested cards are skipped.
  function focusBlockCard(index: number) {
    void tick().then(() => {
      const root = rootElement;
      if (!root) {
        return;
      }

      const card = Array.from(
        root.querySelectorAll<HTMLElement>("[data-nightfire-block-card]")
      ).find(
        (candidate) =>
          candidate.dataset.blockIndex === String(index) && !hasCardAncestor(candidate, root)
      );

      const focusTarget =
        card?.querySelector<HTMLElement>(
          'textarea, [contenteditable="true"], input:not([type="hidden"]), select'
        ) ?? card?.querySelector<HTMLElement>("button");

      focusTarget?.focus();
    });
  }

  function handleSlashContextChange(index: number, context: MarkdownEditorContext) {
    if (!slashCommandsEnabled) {
      if (slashState?.blockIndex === index) {
        closeSlashPalette();
      }
      return;
    }

    const block = blocks[index] as { type?: string } | undefined;
    if (block?.type !== "markdown") {
      if (slashState?.blockIndex === index) {
        closeSlashPalette();
      }
      return;
    }

    const match = findNightfireSlashMatch(context);
    if (!match) {
      if (slashState?.blockIndex === index) {
        closeSlashPalette();
      }
      return;
    }

    slashState = {
      blockIndex: index,
      start: match.start,
      end: match.end,
      query: match.query
    };
  }

  function handleSlashQueryChange(query: string) {
    if (!slashState) {
      return;
    }

    slashState = {
      ...slashState,
      query
    };
  }

  function handleSlashCommandSelect(command: NightfireSlashCommand) {
    if (!slashState) {
      return;
    }

    const slashTarget = slashState;
    const currentBlock = blocks[slashState.blockIndex] as {
      id?: string;
      type?: string;
      version?: string;
      data?: { text?: string };
    } | undefined;
    const currentText = currentBlock?.data?.text ?? "";
    const nextCurrentBlock = {
      ...(currentBlock?.id ? { id: currentBlock.id } : {}),
      type: currentBlock?.type ?? "markdown",
      version: currentBlock?.version ?? "initial",
      data: {
        ...(currentBlock?.data ?? {}),
        text: removeNightfireSlashText(currentText, slashState)
      }
    };
    const updatedBlocks = replaceBlockAtIndex(blocks, slashTarget.blockIndex, nextCurrentBlock);
    const nextBlocks = insertBlockAfter(updatedBlocks, slashTarget.blockIndex, command.type);

    closeSlashPalette();
    emit(asMultiBlockValue(schema, nextBlocks));
    focusBlockCard(slashTarget.blockIndex + 1);
  }

  // For required fields, ensure there is at least one block when the
  // editor is first initialised and the value is empty.
  $effect(() => {
    if (!hasInitialisedRequired && required) {
      if (isEmptyNightfire(value, false)) {
        value = createRequiredInitialValue(
          schema,
          effectiveDef.defaultType ?? "markdown"
        );
      }

      hasInitialisedRequired = true;
    }
  });

  const isEmpty = $derived(isEmptyNightfire(value));
  const showRequiredError = $derived(required && isEmpty);

  // Form serialisation hook: always serialise the current NightfireValue
  // (single or multi) into FormData[name].
  // Use a ref pattern to avoid creating a new function on every value change,
  // which would propagate through bindings and potentially cause re-renders.
  // Use untrack to capture initial values - the $effect below keeps them updated.
  let valueRef = { current: untrack(() => value) };
  let nameRef = { current: untrack(() => name) };

  $effect(() => {
    valueRef.current = value;
    nameRef.current = name;
  });

  const stablePrepare = createPrepareWriter(
    () => valueRef.current,
    () => nameRef.current
  );

  $effect(() => {
    if (prepare !== stablePrepare) {
      prepare = stablePrepare;
    }
  });
</script>

<div class="underlay-nightfire-field" bind:this={rootElement}>
  <NightfireFieldBlockShell
    schema={schema}
    {isMulti}
    definition={effectiveDef}
    {editorTypeOptions}
    {groupedOptions}
    {singleBlock}
    {blocks}
    {slashState}
    {filteredSlashCommands}
    onSingleBlockChange={handleSingleBlockChange}
    onBlocksChange={(nextBlocks) => emit(asMultiBlockValue(schema, nextBlocks))}
    onSingleTypeChange={handleSingleTypeChange}
    onTypeChange={handleTypeChange}
    onBlockContextChange={handleSlashContextChange}
    onSlashQueryChange={handleSlashQueryChange}
    onSlashCommandSelect={handleSlashCommandSelect}
    onCloseSlashPalette={() => {
      if (slashState) {
        focusBlockCard(slashState.blockIndex);
      }
      closeSlashPalette();
    }}
    onAddFirstBlock={addBlock}
  />

  {#if showRequiredError}
    <p class="underlay-nightfire-field__error">This field is required.</p>
  {/if}
</div>

<style>
  .underlay-nightfire-field {
    display: grid;
    gap: var(--nightfire-space-2);
    color: var(--nightfire-color-text);
  }

  .underlay-nightfire-field__error {
    margin-top: calc(var(--nightfire-space-2) * 0.8);
    font-size: var(--nightfire-font-size-sm);
    color: var(--nightfire-color-danger);
  }
</style>
