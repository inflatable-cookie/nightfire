import MarkdownEditor from "./MarkdownEditor.svelte";
import {
  registerBlockEditor,
  registerBlockEmptyChecker,
} from "../editor-registry";

registerBlockEditor(
  null,
  "markdown",
  "Markdown",
  MarkdownEditor
);

registerBlockEmptyChecker("markdown", (block) => {
  const text = block?.data?.text;
  return !text || typeof text !== "string" || text.trim().length === 0;
});
