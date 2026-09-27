<script lang="ts">
  import { sanitizeHtml } from "../html.js";
  import { renderRichTextDocumentHtml } from "./render-document";

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
  // else is refused here. The serializer walks Poodle's stored vocabulary and
  // the result crosses the same sanitizer as markdown before `{@html}`.
  function asDocument(value: unknown): unknown | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if ((value as { type?: unknown }).type !== "doc") return null;
    return value;
  }

  const document = $derived(asDocument(block?.data?.document));
  const safeHtml = $derived(
    document ? sanitizeHtml(renderRichTextDocumentHtml(document)) : ""
  );
</script>

{#if document}
  <div data-nightfire-block="rich_text">
    {#if safeHtml}
      {@html safeHtml}
    {/if}
  </div>
{/if}
