import RichTextEditor from "./RichTextEditor.svelte";
import { isRichTextDocumentEmpty } from "./empty";
import {
  registerBlockEditor,
  registerBlockEmptyChecker
} from "../editor-registry";

// Register the rich-text block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "rich_text", "Rich text", RichTextEditor);

registerBlockEmptyChecker("rich_text", (block) =>
  isRichTextDocumentEmpty(block?.data?.document)
);
