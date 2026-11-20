import RichTextEditor from "./RichTextEditor.svelte";
import { isRichTextDocumentEmpty } from "./empty";
import { registerBlockEditor, registerBlockEmptyChecker } from "../editor-registry";

// Register the rich-text block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "rich_text", "Rich text", RichTextEditor);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

registerBlockEmptyChecker("rich_text", (block: unknown) =>
  isRichTextDocumentEmpty(isRecord(block) && isRecord(block.data) ? block.data.document : null)
);
