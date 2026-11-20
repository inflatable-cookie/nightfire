import MarkdownEditor from "./MarkdownEditor.svelte";
import { registerBlockEditor, registerBlockEmptyChecker } from "../editor-registry";

registerBlockEditor(null, "markdown", "Markdown", MarkdownEditor);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

registerBlockEmptyChecker("markdown", (block: unknown) => {
  const text = isRecord(block) && isRecord(block.data) ? block.data.text : null;
  return typeof text !== "string" || text.trim().length === 0;
});
