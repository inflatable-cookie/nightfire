import ItemListEditor from "./ItemListEditor.svelte";
import TableEditor from "./TableEditor.svelte";
import {
  isBlockContentEmpty,
  registerBlockEditor,
  registerBlockEmptyChecker
} from "../editor-registry";

registerBlockEditor(null, "item_list", "Item list", ItemListEditor);
registerBlockEditor(null, "table", "Table", TableEditor);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

registerBlockEmptyChecker("item_list", (block: unknown) => {
  const rawItems = isRecord(block) && isRecord(block.data) ? block.data.items : null;
  const items: Array<unknown> = Array.isArray(rawItems) ? rawItems : [];
  return !items.some((item) => {
    if (!isRecord(item)) {
      return false;
    }
    if (typeof item.title === "string" && item.title.trim().length > 0) {
      return true;
    }

    const body = item.body;
    const children: Array<unknown> = Array.isArray(body) ? body : body ? [body] : [];
    return children.some((child) => !isBlockContentEmpty(child));
  });
});

registerBlockEmptyChecker("table", (block: unknown) => {
  const data = isRecord(block) && isRecord(block.data) ? block.data : null;
  const caption = data?.caption;
  if (typeof caption === "string" && caption.trim().length > 0) {
    return false;
  }

  const rawRows = data?.rows;
  const rows: Array<unknown> = Array.isArray(rawRows) ? rawRows : [];
  return !rows.some((row) => {
    if (!isRecord(row) || !Array.isArray(row.cells)) {
      return false;
    }
    const cells: Array<unknown> = row.cells;
    return cells.some(
      (cell) =>
        isRecord(cell) && typeof cell.markdown === "string" && cell.markdown.trim().length > 0
    );
  });
});
