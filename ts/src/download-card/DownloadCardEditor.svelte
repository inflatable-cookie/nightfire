<script lang="ts">
  // Generic download-card editor.
  //
  // The author picks one or more files from the consumer's library through the
  // media-source registry, then optionally describes the card and each file.
  // The editor writes the whole pinned shape -- the card description and each
  // file's `{ media_id, description }` -- and nothing else, so no field the
  // author entered is silently dropped.
  import { Button, TextInput } from "@inflatable-cookie/poodle-svelte";
  import type { MarkdownEditorContext } from "../markup/markdown-editor-context";
  import { getMediaSource } from "../media-source";

  type CardFile = { media_id: string; description?: string };

  type DownloadCardBlock = {
    type: string;
    version?: string;
    data?: {
      description?: string;
      files?: CardFile[];
    };
  };

  interface Props {
    block: DownloadCardBlock;
    onChange: (block: DownloadCardBlock) => void;
    onContextChange?: ((context: MarkdownEditorContext) => void) | null;
  }

  let { block, onChange, onContextChange = null }: Props = $props();

  // Read once at mount: registration happens at the consumer's boundary,
  // before any editor renders.
  const mediaSource = getMediaSource();

  const description = $derived(
    typeof block?.data?.description === "string" ? block.data.description : ""
  );
  const files = $derived(
    (Array.isArray(block?.data?.files) ? block.data.files : []).filter(
      (file): file is CardFile =>
        file !== null && typeof file === "object" && typeof file.media_id === "string"
    )
  );

  let picking = $state(false);

  function cardDescription(file: CardFile): string {
    return typeof file.description === "string" ? file.description : "";
  }

  function resolvedName(mediaId: string): string | null {
    return mediaSource?.resolve({ media_id: mediaId })?.filename ?? null;
  }

  function emit(updates: { description?: string; files?: CardFile[] }) {
    const nextDescription = updates.description ?? description;
    const nextFiles = updates.files ?? files.map((file) => ({ ...file }));
    onChange({
      type: block?.type ?? "download_card",
      version: block?.version ?? "initial",
      data: {
        ...(nextDescription.length > 0 ? { description: nextDescription } : {}),
        files: nextFiles
      }
    });
  }

  async function handlePick() {
    if (!mediaSource || picking) return;
    picking = true;

    try {
      const picked = await mediaSource.pick({ multiple: true });
      if (!picked) return; // cancelled

      const known = new Set(files.map((file) => file.media_id));
      const additions = picked
        .filter(
          (reference): reference is { media_id: string } =>
            reference !== null &&
            typeof reference === "object" &&
            typeof reference.media_id === "string" &&
            reference.media_id.trim().length > 0 &&
            !known.has(reference.media_id)
        )
        .map((reference) => ({ media_id: reference.media_id }));

      if (additions.length > 0) {
        emit({ files: [...files, ...additions] });
      }
    } finally {
      picking = false;
    }
  }

  function removeFile(index: number) {
    emit({ files: files.filter((_, i) => i !== index) });
  }

  function setFileDescription(index: number, value: string) {
    emit({
      files: files.map((file, i) => {
        const next = { ...file };
        if (i === index) {
          if (value.length > 0) next.description = value;
          else delete next.description;
        }
        return next;
      })
    });
  }
</script>

<div class="underlay-download-card-editor">
  <div class="underlay-download-card-editor__description">
    <TextInput
      id="nightfire-download-card-description"
      placeholder="Card description (optional)"
      value={description}
      onValueChange={(nextValue) => emit({ description: nextValue })}
    />
  </div>

  {#if files.length > 0}
    <ul class="underlay-download-card-editor__files">
      {#each files as file, index (index)}
        <li class="underlay-download-card-editor__file">
          <div class="underlay-download-card-editor__file-info">
            <span class="underlay-download-card-editor__file-name">
              {resolvedName(file.media_id) ?? file.media_id}
            </span>
            <span class="underlay-download-card-editor__file-id">{file.media_id}</span>
          </div>
          <div class="underlay-download-card-editor__file-controls">
            <TextInput
              id={`nightfire-download-card-file-${index}`}
              placeholder="File description (optional)"
              value={cardDescription(file)}
              onValueChange={(nextValue) => setFileDescription(index, nextValue)}
            />
            <Button
              type="button"
              variant="ghost"
              tone="danger"
              size="sm"
              onClick={() => removeFile(index)}
            >
              Remove
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="underlay-download-card-editor__actions">
    {#if mediaSource}
      <Button type="button" variant="secondary" onClick={handlePick} loading={picking}>
        {picking ? "Opening picker…" : files.length > 0 ? "Add files" : "Choose files"}
      </Button>
    {:else}
      <p class="underlay-download-card-editor__no-source">
        No media source is registered. Existing files stay editable.
      </p>
    {/if}
  </div>
</div>

<style>
  .underlay-download-card-editor {
    display: grid;
    gap: var(--nightfire-space-3, 0.75rem);
  }

  .underlay-download-card-editor__files {
    display: grid;
    gap: var(--nightfire-space-2, 0.5rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .underlay-download-card-editor__file {
    display: grid;
    gap: var(--nightfire-space-2, 0.5rem);
    padding: var(--nightfire-space-3, 0.75rem);
    border: 1px solid var(--nightfire-color-border-subtle, rgba(148, 163, 184, 0.35));
    border-radius: var(--nightfire-radius-md, 0.375rem);
    background: var(--nightfire-color-surface-secondary, rgba(255, 255, 255, 0.03));
  }

  .underlay-download-card-editor__file-info {
    display: flex;
    flex-direction: column;
    gap: var(--nightfire-space-1, 0.25rem);
    min-width: 0;
  }

  .underlay-download-card-editor__file-name {
    font-weight: 600;
    font-size: calc(1em * var(--nightfire-font-scale-sm, 0.875));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .underlay-download-card-editor__file-id {
    font-size: calc(1em * var(--nightfire-font-scale-xs, 0.75));
    color: var(--nightfire-color-text-muted, rgba(148, 163, 184, 0.7));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--nightfire-font-mono, monospace);
  }

  .underlay-download-card-editor__file-controls {
    display: flex;
    gap: var(--nightfire-space-2, 0.5rem);
    align-items: center;
  }

  .underlay-download-card-editor__file-controls :global(.poodle-text-input) {
    flex: 1;
  }

  .underlay-download-card-editor__actions {
    display: flex;
    align-items: center;
  }

  .underlay-download-card-editor__no-source {
    margin: 0;
    font-size: calc(1em * var(--nightfire-font-scale-sm, 0.875));
    color: var(--nightfire-color-text-muted, rgba(148, 163, 184, 0.7));
  }
</style>
