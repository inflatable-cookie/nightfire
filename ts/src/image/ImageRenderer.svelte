<script lang="ts">
  // Generic image renderer.
  //
  // The image is one media-library reference; the URL, intrinsic dimensions
  // and library title come from the source that owns them, resolved
  // synchronously through the media-source registry — no editor module in
  // this graph, no Svelte context, no suspending. A missing source or an
  // unknown reference renders the block inert and marked; it never throws.
  // No `media_id` renders nothing at all.
  //
  // The same styling rule as every other renderer applies: semantic markup, a
  // `data-nightfire-block` hook, data attributes for structure, no scoped
  // styles, no class of our own, no token — and no style attribute at all.
  // Sizing is a preset hint the consumer's stylesheet interprets; an unknown
  // or absent preset degrades to natural size.
  import { getMediaSource, type ResolvedMedia } from "../media-source";

  /** Closed sizing presets. Absent means natural size. */
  const SIZING_PRESETS = new Set(["small", "medium", "large", "full"]);

  type ImageBlock = {
    data?: {
      media_id?: unknown;
      alt?: unknown;
      title?: unknown;
      caption?: unknown;
      sizing?: unknown;
    };
  };

  interface Props {
    block: ImageBlock;
  }

  let { block }: Props = $props();

  const mediaId = $derived(
    typeof block?.data?.media_id === "string" && block.data.media_id.trim().length > 0
      ? block.data.media_id
      : ""
  );
  const alt = $derived(typeof block?.data?.alt === "string" ? block.data.alt : "");
  const title = $derived(
    typeof block?.data?.title === "string" && block.data.title.length > 0
      ? block.data.title
      : ""
  );
  const caption = $derived(
    typeof block?.data?.caption === "string" && block.data.caption.length > 0
      ? block.data.caption
      : ""
  );
  // A preset is a hint, not a width: anything outside the closed set degrades
  // to natural size rather than emitting an appearance value.
  const sizing = $derived(
    typeof block?.data?.sizing === "string" && SIZING_PRESETS.has(block.data.sizing)
      ? block.data.sizing
      : undefined
  );

  function resolveReference(reference: string): ResolvedMedia | null {
    return getMediaSource()?.resolve({ media_id: reference }) ?? null;
  }

  function dimension(value: number | undefined): number | undefined {
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? Math.round(value)
      : undefined;
  }
</script>

{#if mediaId}
  {@const resolved = resolveReference(mediaId)}
  <figure
    data-nightfire-block="image"
    data-sizing={sizing}
    data-media-state={resolved ? "resolved" : "inert"}
  >
    {#if resolved}
      <img
        src={resolved.url}
        {alt}
        title={title || undefined}
        width={dimension(resolved.width)}
        height={dimension(resolved.height)}
      />
    {/if}
    {#if caption}
      <figcaption data-image-caption>{caption}</figcaption>
    {/if}
  </figure>
{/if}
