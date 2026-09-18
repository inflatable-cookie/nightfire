<script lang="ts">
  // Generic image editor.
  //
  // The author picks one image from the consumer's library through the
  // media-source registry, then writes alt text next to the picker and
  // optionally a title, a caption, and a sizing preset. The editor writes the
  // whole pinned shape — `{ media_id, alt?, title?, caption?, sizing? }` —
  // and nothing else, so a resolved URL never enters block data.
  import { Button, Select, TextInput } from "@inflatable-cookie/poodle-svelte";
  import { MediaKind, getMediaSource } from "../media-source";

  type ImageBlock = {
    type: string;
    version?: string;
    data?: {
      media_id?: string;
      alt?: string;
      title?: string;
      caption?: string;
      sizing?: string;
    };
  };

  interface Props {
    block: ImageBlock;
    onChange: (block: ImageBlock) => void;
  }

  let { block, onChange }: Props = $props();

  // Read once at mount: registration happens at the consumer's boundary,
  // before any editor renders.
  const mediaSource = getMediaSource();

  const mediaId = $derived(
    typeof block?.data?.media_id === "string" ? block.data.media_id : ""
  );
  const alt = $derived(typeof block?.data?.alt === "string" ? block.data.alt : "");
  const title = $derived(typeof block?.data?.title === "string" ? block.data.title : "");
  const caption = $derived(
    typeof block?.data?.caption === "string" ? block.data.caption : ""
  );
  const sizing = $derived(
    typeof block?.data?.sizing === "string" ? block.data.sizing : ""
  );

  let picking = $state(false);

  const sizingOptions = [
    { value: "", label: "Natural size" },
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
    { value: "full", label: "Full" }
  ];

  function resolvedName(reference: string): string | null {
    return mediaSource?.resolve({ media_id: reference })?.filename ?? null;
  }

  function emit(updates: {
    media_id?: string;
    alt?: string;
    title?: string;
    caption?: string;
    sizing?: string;
  }) {
    const nextMediaId = updates.media_id ?? mediaId;
    const nextAlt = updates.alt ?? alt;
    const nextTitle = updates.title ?? title;
    const nextCaption = updates.caption ?? caption;
    const nextSizing = updates.sizing ?? sizing;
    onChange({
      type: block?.type ?? "image",
      version: block?.version ?? "initial",
      data: {
        ...(nextMediaId.length > 0 ? { media_id: nextMediaId } : {}),
        ...(nextAlt.length > 0 ? { alt: nextAlt } : {}),
        ...(nextTitle.length > 0 ? { title: nextTitle } : {}),
        ...(nextCaption.length > 0 ? { caption: nextCaption } : {}),
        ...(nextSizing.length > 0 ? { sizing: nextSizing } : {})
      }
    });
  }

  async function handlePick() {
    if (!mediaSource || picking) return;
    picking = true;

    try {
      const picked = await mediaSource.pick({
        multiple: false,
        filterKind: MediaKind.Image
      });
      if (!picked) return; // cancelled

      const first = picked.find(
        (reference) =>
          reference !== null &&
          typeof reference === "object" &&
          typeof reference.media_id === "string" &&
          reference.media_id.trim().length > 0
      );
      if (first) {
        emit({ media_id: first.media_id });
      }
    } finally {
      picking = false;
    }
  }

  function handleSizingChange(value: string) {
    emit({ sizing: value });
  }
</script>

<div class="underlay-image-editor">
  <div class="underlay-image-editor__pick">
    {#if mediaId}
      <div class="underlay-image-editor__file-info">
        <span class="underlay-image-editor__file-name">
          {resolvedName(mediaId) ?? mediaId}
        </span>
        <span class="underlay-image-editor__file-id">{mediaId}</span>
      </div>
    {/if}
    {#if mediaSource}
      <Button type="button" variant="secondary" onClick={handlePick} loading={picking}>
        {picking ? "Opening picker…" : mediaId ? "Replace image" : "Choose image"}
      </Button>
    {:else}
      <p class="underlay-image-editor__no-source">
        No media source is registered. Existing settings stay editable.
      </p>
    {/if}
  </div>

  <div class="underlay-image-editor__alt">
    <TextInput
      id="nightfire-image-alt"
      placeholder="Alt text"
      value={alt}
      onValueChange={(nextValue) => emit({ alt: nextValue })}
    />
  </div>

  <div class="underlay-image-editor__meta">
    <TextInput
      id="nightfire-image-title"
      placeholder="Title (optional)"
      value={title}
      onValueChange={(nextValue) => emit({ title: nextValue })}
    />
    <TextInput
      id="nightfire-image-caption"
      placeholder="Caption (optional)"
      value={caption}
      onValueChange={(nextValue) => emit({ caption: nextValue })}
    />
  </div>

  <div class="underlay-image-editor__sizing">
    <Select
      value={sizing}
      options={sizingOptions}
      ariaLabel="Image size"
      onValueChange={handleSizingChange}
    />
  </div>
</div>

<style>
  .underlay-image-editor {
    display: grid;
    gap: var(--nightfire-space-3);
  }

  .underlay-image-editor__pick {
    display: grid;
    gap: var(--nightfire-space-2);
    align-items: start;
  }

  .underlay-image-editor__file-info {
    display: flex;
    flex-direction: column;
    gap: var(--nightfire-space-1);
    min-width: 0;
  }

  .underlay-image-editor__file-name {
    font-weight: 600;
    font-size: calc(1em * var(--nightfire-font-scale-sm));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .underlay-image-editor__file-id {
    font-size: calc(1em * var(--nightfire-font-scale-xs));
    color: var(--nightfire-color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--nightfire-font-mono);
  }

  .underlay-image-editor__meta {
    display: grid;
    gap: var(--nightfire-space-2);
  }

  .underlay-image-editor__no-source {
    margin: 0;
    font-size: calc(1em * var(--nightfire-font-scale-sm));
    color: var(--nightfire-color-text-muted);
  }
</style>
