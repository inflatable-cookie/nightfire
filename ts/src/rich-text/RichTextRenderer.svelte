<script lang="ts">
  import {
    RichTextRenderer as PoodleRichTextRenderer,
    RICH_TEXT_FEATURES,
    type ProseMirrorDocumentJSON
  } from "@inflatable-cookie/poodle-svelte/rich-text";

  type RichTextBlock = {
    data?: {
      document?: unknown;
    };
  };

  interface Props {
    block: RichTextBlock;
  }

  let { block }: Props = $props();

  // The document envelope is `{ document: ProseMirrorDocumentJSON }`. Anything
  // else is refused here rather than handed to the engine, which fails closed by
  // throwing. The feature set is Poodle's own closed set; nothing is local.
  function asDocument(value: unknown): ProseMirrorDocumentJSON | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if ((value as { type?: unknown }).type !== "doc") return null;
    return value as ProseMirrorDocumentJSON;
  }

  const document = $derived(asDocument(block?.data?.document));
</script>

{#if document}
  <div data-nightfire-block="rich_text">
    <PoodleRichTextRenderer value={document} features={RICH_TEXT_FEATURES} />
  </div>
{/if}
