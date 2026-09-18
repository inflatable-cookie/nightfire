<script lang="ts">
  import {
    RichTextEditor as PoodleRichTextEditor,
    RICH_TEXT_FEATURES,
    type ProseMirrorDocumentJSON
  } from "@inflatable-cookie/poodle-svelte/rich-text";

  type RichTextBlock = {
    type?: string;
    version?: string;
    data?: {
      document?: unknown;
    };
  };

  interface Props {
    block: RichTextBlock;
    onChange?: (next: RichTextBlock) => void;
  }

  let { block, onChange = () => {} }: Props = $props();

  // An absent or malformed document starts from an empty ProseMirror document
  // rather than handing the engine an invalid value.
  function emptyDocument(): ProseMirrorDocumentJSON {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  function asDocument(value: unknown): ProseMirrorDocumentJSON {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as { type?: unknown }).type === "doc"
    ) {
      return value as ProseMirrorDocumentJSON;
    }
    return emptyDocument();
  }

  const document = $derived(asDocument(block?.data?.document));

  function handleChange(next: ProseMirrorDocumentJSON) {
    onChange({
      type: block?.type ?? "rich_text",
      version: block?.version ?? "initial",
      data: { document: next }
    });
  }
</script>

<div>
  <PoodleRichTextEditor
    value={document}
    features={RICH_TEXT_FEATURES}
    placeholder="Write rich text..."
    onChange={handleChange}
  />
</div>
