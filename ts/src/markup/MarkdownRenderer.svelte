<script lang="ts">
  import { renderSafeMarkdownHtml } from "./safe-markdown";

  type MarkdownBlock = {
    data?: {
      text?: unknown;
    };
  };

  interface Props {
    block: MarkdownBlock;
  }

  let { block }: Props = $props();

  const text = $derived(typeof block?.data?.text === "string" ? block.data.text : "");
  const safeHtml = $derived(renderSafeMarkdownHtml(text));
</script>

{#if safeHtml}
  <div data-nightfire-block="markdown">
    {@html safeHtml}
  </div>
{/if}
