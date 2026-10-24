<script lang="ts">
  import { renderRichTextHtml } from "./render-html";

  type RichTextBlock = {
    data?: {
      document?: unknown;
    };
  };

  interface Props {
    block: RichTextBlock;
    // The consumer schema scopes inline-node registrations. `value` is accepted
    // too because NightfireRenderer also forwards the whole value, but `schema`
    // is the direct contract for a consumer rendering this block itself.
    schema?: string | null;
    value?: { schema?: string } | null;
  }

  let { block, schema = null, value = null }: Props = $props();

  // The document envelope is `{ document: ProseMirrorDocumentJSON }`. Anything
  // else is refused here. The serializer walks Poodle's stored vocabulary,
  // composes any schema-scoped consumer inline-node renderers, and the result
  // crosses the same sanitizer as markdown before `{@html}`.
  function asDocument(candidate: unknown): unknown | null {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    if ((candidate as { type?: unknown }).type !== "doc") return null;
    return candidate;
  }

  const activeSchema = $derived(
    typeof schema === "string" && schema.length > 0
      ? schema
      : typeof value?.schema === "string" && value.schema.length > 0
        ? value.schema
        : null
  );

  const document = $derived(asDocument(block?.data?.document));
  const safeHtml = $derived(
    document ? renderRichTextHtml(document, { schema: activeSchema }) : ""
  );
</script>

{#if document}
  <div data-nightfire-block="rich_text">
    {#if safeHtml}
      {@html safeHtml}
    {/if}
  </div>
{/if}
