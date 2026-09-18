import ItemListEditor from "./ItemListEditor.svelte";
import TableEditor from "./TableEditor.svelte";
import {
  isBlockContentEmpty,
  registerBlockEditor,
  registerBlockEmptyChecker,
} from "../editor-registry";

registerBlockEditor(null, "item_list", "Item list", ItemListEditor);
registerBlockEditor(null, "table", "Table", TableEditor);

registerBlockEmptyChecker("item_list", (block) => {
  const items = Array.isArray(block?.data?.items) ? block.data.items : [];
  return !items.some((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const title = (item as { title?: unknown }).title;
    if (typeof title === "string" && title.trim().length > 0) return true;

    const body = (item as { body?: unknown }).body;
    const children = Array.isArray(body) ? body : body ? [body] : [];
    return children.some((child) => !isBlockContentEmpty(child));
  });
});

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
