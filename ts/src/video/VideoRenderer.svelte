<script lang="ts">
  // Generic video renderer.
  //
  // A video is an embed addressed by provider and id. Provider parsing and
  // rendering stay Poodle's: `renderEmbed` turns the stored embed back into
  // markup, and that markup goes through the existing embed sanitizer before
  // `{@html}` — contract 002, without exception. The verbatim
  // `originalEmbed` a paste carries is the hostile path the sanitizer exists
  // for. No editor module in this graph, and no media-source registry: an
  // embed needs no library.
  //
  // The same styling rule as every other renderer applies: semantic markup, a
  // `data-nightfire-block` hook, data attributes for structure, no scoped
  // styles, no class of our own, no token — and no style attribute at all.
  import { renderEmbed, type ParsedEmbed } from "@inflatable-cookie/poodle-svelte";
  import { sanitizeEmbedHtml } from "../html.js";

  type VideoBlock = {
    data?: {
      embed?: unknown;
      title?: unknown;
      caption?: unknown;
    };
  };

  interface Props {
    block: VideoBlock;
  }

  let { block }: Props = $props();

  // An embed is addressable when it carries a provider and an id, both
  // non-empty strings. Anything else renders nothing at all.
  function asEmbed(value: unknown): ParsedEmbed | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as { provider?: unknown; id?: unknown };
    if (typeof candidate.provider !== "string" || candidate.provider.length === 0) {
      return null;
    }
    if (typeof candidate.id !== "string" || candidate.id.length === 0) return null;
    return value as ParsedEmbed;
  }

  // The block's title is the embed frame's accessible name: it travels as the
  // iframe's title attribute, which the embed sanitizer admits, so a hostile
  // title cannot break out of the attribute.
  function withAccessibleName(markup: string, title: string): string {
    if (!title) return markup;
    const escaped = title.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    return markup.replace(/<iframe(?=[\s>])/i, `<iframe title="${escaped}"`);
  }

  const embed = $derived(asEmbed(block?.data?.embed));
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
  const safeHtml = $derived(
    embed ? sanitizeEmbedHtml(withAccessibleName(renderEmbed(embed) ?? "", title)) : ""
  );
</script>

{#if embed}
  <figure data-nightfire-block="video" data-embed-state={safeHtml ? "ready" : "inert"}>
    {#if safeHtml}
      {@html safeHtml}
    {/if}
    {#if caption}
      <figcaption data-video-caption>{caption}</figcaption>
    {/if}
  </figure>
{/if}
