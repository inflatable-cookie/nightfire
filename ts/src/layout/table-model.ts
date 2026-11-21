export type Edge = "top" | "right" | "bottom" | "left";
export type TableCell = Record<string, unknown> & {
  markdown?: string;
  is_header?: boolean;
  colspan?: number;
  rowspan?: number;
  horizontal_align?: string | null;
  vertical_align?: string | null;
  borders?: Partial<Record<Edge, boolean>>;
};
export type TableRow = Record<string, unknown> & { cells?: Array<TableCell> };
export type GridEntry = {
  cell: TableCell;
  cellIndex: number;
  row: number;
  column: number;
  colspan: number;
  rowspan: number;
};
export type GridLayout = {
  entries: Array<GridEntry>;
  slots: Map<string, GridEntry>;
  width: number;
};
export type Bounds = { top: number; right: number; bottom: number; left: number };

type Positioned = { row: number; column: number; cell: TableCell };
const key = (row: number, column: number) => `${row}:${column}`;
// HTML's own span limits (colspan 1000, rowspan 65534). A stored value above
// them cannot mean anything, and reading one unbounded would allocate the slot
// grid from malformed data.
const MAX_COLSPAN = 1000;
const MAX_ROWSPAN = 65_534;
// The slot grid is materialised, so one cell never reserves more slots than
// this, whatever span it stores. The ceiling bounds the allocation a single
// malformed entry can ask for; the rest of the grid stays proportional to the
// table's own cells.
const MAX_CELL_SLOTS = 250_000;
const clampSpan = (value: unknown, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value > 1 ? Math.min(value, max) : 1;
// A column span shares its allocation with the row span it covers, so the
// per-cell ceiling bounds both.
const columnSpan = (value: unknown, rowspan: number) =>
  clampSpan(value, Math.min(MAX_COLSPAN, Math.max(1, Math.floor(MAX_CELL_SLOTS / rowspan))));
const rowSpan = (value: unknown) => clampSpan(value, MAX_ROWSPAN);
export const emptyCell = (header = false): TableCell => ({
  markdown: "",
  ...(header ? { is_header: true } : {})
});
const hasContent = (cell: TableCell): boolean =>
  typeof cell.markdown === "string" && cell.markdown.trim().length > 0;

function areaIsFree(
  slots: Map<string, GridEntry>,
  row: number,
  column: number,
  rowspan: number,
  colspan: number
): boolean {
  for (let r = 0; r < rowspan; r += 1) {
    for (let c = 0; c < colspan; c += 1) {
      if (slots.has(key(row + r, column + c))) {
        return false;
      }
    }
  }
  return true;
}

export function layoutRows(rows: Array<TableRow>): GridLayout {
  const entries: Array<GridEntry> = [];
  const slots = new Map<string, GridEntry>();
  let width = 1;
  rows.forEach((row, rowIndex) => {
    let column = 0;
    // A stored rowspan cannot reach past the table's last row: a one-row table
    // holding `rowspan: 65534` is one row, not sixty-five thousand.
    const remainingRows = Math.max(1, rows.length - rowIndex);
    (Array.isArray(row.cells) ? row.cells : []).forEach((cell, cellIndex) => {
      const rowspan = Math.min(rowSpan(cell.rowspan), remainingRows);
      const colspan = columnSpan(cell.colspan, rowspan);
      while (!areaIsFree(slots, rowIndex, column, rowspan, colspan)) {
        column += 1;
      }
      const entry = { cell, cellIndex, row: rowIndex, column, colspan, rowspan };
      entries.push(entry);
      for (let r = 0; r < rowspan; r++) {
        for (let c = 0; c < colspan; c++) {
          slots.set(key(rowIndex + r, column + c), entry);
        }
      }
      column += colspan;
      width = Math.max(width, column);
    });
  });
  return { entries, slots, width };
}
export const entryAt = (layout: GridLayout, row: number, column: number) =>
  layout.slots.get(key(row, column));

function setSpan(cell: TableCell, field: "colspan" | "rowspan", value: number): void {
  if (value > 1) {
    cell[field] = value;
  } else {
    delete cell[field];
  }
}

// Rebuild from visual origins, filling uncovered slots while keeping row metadata.
function buildRows(
  rows: Array<TableRow>,
  positioned: Array<Positioned>,
  width: number
): Array<TableRow> {
  const occupied = new Set<string>();
  for (const { row, column, cell } of positioned) {
    const rowspan = Math.min(rowSpan(cell.rowspan), Math.max(1, rows.length - row));
    const colspan = columnSpan(cell.colspan, rowspan);
    for (let r = 0; r < rowspan; r++) {
      for (let c = 0; c < colspan; c++) {
        occupied.add(key(row + r, column + c));
      }
    }
  }
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < width; c++) {
      if (!occupied.has(key(r, c))) {
        positioned.push({ row: r, column: c, cell: emptyCell() });
      }
    }
  }
  return rows.map((row, r) => ({
    ...row,
    cells: positioned
      .filter((item) => item.row === r)
      .sort((a, b) => a.column - b.column)
      .map((item) => item.cell)
  }));
}

export function normalizedRows(source: Array<TableRow>): Array<TableRow> {
  const layout = layoutRows(source);
  // Clamped spans end inside the table, so the row count stays the table's own
  // length; the loop avoids a spread over a large entry list.
  let count = Math.max(source.length, 1);
  for (const entry of layout.entries) {
    count = Math.max(count, entry.row + entry.rowspan);
  }
  const rows = Array.from({ length: count }, (_, index) => source[index] ?? { cells: [] });
  return buildRows(
    rows,
    layout.entries.map(({ row, column, cell }) => ({ row, column, cell: { ...cell } })),
    layout.width
  );
}

export function entriesForSelection(layout: GridLayout, bounds: Bounds): Array<GridEntry> | null {
  const selected = new Set<GridEntry>();
  for (let r = bounds.top; r <= bounds.bottom; r++) {
    for (let c = bounds.left; c <= bounds.right; c++) {
      const entry = entryAt(layout, r, c);
      if (
        !entry ||
        entry.row < bounds.top ||
        entry.column < bounds.left ||
        entry.row + entry.rowspan - 1 > bounds.bottom ||
        entry.column + entry.colspan - 1 > bounds.right
      ) {
        return null;
      }
      selected.add(entry);
    }
  }
  return [...selected];
}
export function mergeHasDiscardedContent(entries: Array<GridEntry>, bounds: Bounds): boolean {
  return entries.some(
    (entry) => (entry.row !== bounds.top || entry.column !== bounds.left) && hasContent(entry.cell)
  );
}
export function mergeCells(source: Array<TableRow>, bounds: Bounds): Array<TableRow> {
  const rows = normalizedRows(source),
    layout = layoutRows(rows),
    selected = entriesForSelection(layout, bounds);
  const topLeft = selected?.find(
    (entry) => entry.row === bounds.top && entry.column === bounds.left
  );
  if (!selected || selected.length < 2 || !topLeft) {
    return rows;
  }
  const cell = { ...topLeft.cell };
  setSpan(cell, "colspan", bounds.right - bounds.left + 1);
  setSpan(cell, "rowspan", bounds.bottom - bounds.top + 1);
  const positioned = layout.entries
    .filter((entry) => !selected.includes(entry))
    .map(({ row, column, cell }) => ({ row, column, cell: { ...cell } }));
  positioned.push({ row: topLeft.row, column: topLeft.column, cell });
  return buildRows(rows, positioned, layout.width);
}
export function splitCell(source: Array<TableRow>, row: number, column: number): Array<TableRow> {
  const rows = normalizedRows(source),
    layout = layoutRows(rows),
    entry = entryAt(layout, row, column);
  if (!entry) {
    return rows;
  }
  const positioned = layout.entries
    .filter((item) => item !== entry)
    .map(({ row, column, cell }) => ({ row, column, cell: { ...cell } }));
  const cell = { ...entry.cell };
  delete cell.colspan;
  delete cell.rowspan;
  for (let r = 0; r < entry.rowspan; r++) {
    for (let c = 0; c < entry.colspan; c++) {
      positioned.push({
        row: entry.row + r,
        column: entry.column + c,
        cell: r === 0 && c === 0 ? cell : emptyCell(cell.is_header === true)
      });
    }
  }
  return buildRows(rows, positioned, layout.width);
}
export function isHeaderRow(layout: GridLayout, row: number): boolean {
  const cells = new Set(
    Array.from({ length: layout.width }, (_, column) => entryAt(layout, row, column)).filter(
      (entry): entry is GridEntry => !!entry
    )
  );
  return cells.size > 0 && [...cells].every((entry) => entry.cell.is_header === true);
}
export function toggleHeaderRow(source: Array<TableRow>, row: number): Array<TableRow> {
  const rows = normalizedRows(source),
    layout = layoutRows(rows),
    makeHeader = !isHeaderRow(layout, row);
  const selected = new Set(
    Array.from({ length: layout.width }, (_, column) => entryAt(layout, row, column))
  );
  for (const entry of layout.entries) {
    if (selected.has(entry)) {
      const cell = rows[entry.row]?.cells?.[entry.cellIndex];
      if (!cell) {
        continue;
      }
      if (makeHeader) {
        cell.is_header = true;
      } else {
        delete cell.is_header;
      }
    }
  }
  return rows;
}
export function insertRow(source: Array<TableRow>, index: number): Array<TableRow> {
  const rows = normalizedRows(source),
    layout = layoutRows(rows);
  const positioned = layout.entries.map((entry) => {
    const cell = { ...entry.cell };
    if (entry.row < index && entry.row + entry.rowspan > index) {
      setSpan(cell, "rowspan", entry.rowspan + 1);
    }
    return { row: entry.row >= index ? entry.row + 1 : entry.row, column: entry.column, cell };
  });
  rows.splice(index, 0, { cells: [] });
  return buildRows(rows, positioned, layout.width);
}
export function insertColumn(source: Array<TableRow>, index: number): Array<TableRow> {
  const rows = normalizedRows(source),
    layout = layoutRows(rows);
  const positioned = layout.entries.map((entry) => {
    const cell = { ...entry.cell };
    if (entry.column < index && entry.column + entry.colspan > index) {
      setSpan(cell, "colspan", entry.colspan + 1);
    }
    return {
      row: entry.row,
      column: entry.column >= index ? entry.column + 1 : entry.column,
      cell
    };
  });
  for (let row = 0; row < rows.length; row++) {
    const crossing = entryAt(layout, row, index - 1);
    if (!(crossing && crossing.column + crossing.colspan > index)) {
      positioned.push({ row, column: index, cell: emptyCell(isHeaderRow(layout, row)) });
    }
  }
  return buildRows(rows, positioned, layout.width + 1);
}
export function lineHasContent(
  source: Array<TableRow>,
  kind: "row" | "column",
  index: number
): boolean {
  const layout = layoutRows(normalizedRows(source));
  return layout.entries.some((entry) =>
    kind === "row"
      ? entry.row === index && entry.rowspan === 1 && hasContent(entry.cell)
      : entry.column === index && entry.colspan === 1 && hasContent(entry.cell)
  );
}
export function removeLine(
  source: Array<TableRow>,
  kind: "row" | "column",
  index: number
): Array<TableRow> {
  const rows = normalizedRows(source),
    layout = layoutRows(rows);
  if ((kind === "row" ? rows.length : layout.width) <= 1) {
    return rows;
  }
  const positioned: Array<Positioned> = [];
  for (const entry of layout.entries) {
    const start = kind === "row" ? entry.row : entry.column;
    const length = kind === "row" ? entry.rowspan : entry.colspan;
    const cell = { ...entry.cell };
    if (start <= index && start + length > index) {
      if (length === 1) {
        continue;
      }
      setSpan(cell, kind === "row" ? "rowspan" : "colspan", length - 1);
    }
    const position = start > index ? start - 1 : start;
    positioned.push({
      row: kind === "row" ? position : entry.row,
      column: kind === "column" ? position : entry.column,
      cell
    });
  }
  if (kind === "row") {
    rows.splice(index, 1);
  }
  return buildRows(rows, positioned, layout.width - (kind === "column" ? 1 : 0));
}
