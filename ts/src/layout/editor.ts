import TableEditor from "./TableEditor.svelte";
import {
  registerBlockEditor,
  registerBlockEmptyChecker,
} from "../editor-registry";

registerBlockEditor(null, "table", "Table", TableEditor);

registerBlockEmptyChecker("table", (block) => {
  const caption = block?.data?.caption;
  if (typeof caption === "string" && caption.trim().length > 0) return false;

  const rows = Array.isArray(block?.data?.rows) ? block.data.rows : [];
  return !rows.some(
    (row: unknown) =>
      row !== null &&
      typeof row === "object" &&
      Array.isArray((row as { cells?: unknown }).cells) &&
      (row as { cells: unknown[] }).cells.some(
        (cell) =>
          cell !== null &&
          typeof cell === "object" &&
          typeof (cell as { markdown?: unknown }).markdown === "string" &&
          (cell as { markdown: string }).markdown.trim().length > 0,
      ),
  );
});
