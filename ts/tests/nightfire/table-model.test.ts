import { describe, expect, it } from "bun:test";
import {
  entryAt,
  entriesForSelection,
  insertColumn,
  insertRow,
  isHeaderRow,
  layoutRows,
  lineHasContent,
  mergeCells,
  mergeHasDiscardedContent,
  normalizedRows,
  removeLine,
  splitCell,
  toggleHeaderRow
} from "../../src/layout/table-model";

function grid(rows: Parameters<typeof layoutRows>[0]) {
  const layout = layoutRows(rows);
  return rows.map((_, r) =>
    Array.from({ length: layout.width }, (_, c) => entryAt(layout, r, c)?.cell.markdown)
  );
}

describe("table grid model", () => {
  const source = [
    {
      section: "head",
      cells: [{ markdown: "A", colspan: 2, rowspan: 2, is_header: true }, { markdown: "B" }]
    },
    { section: "body", cells: [{ markdown: "C" }] },
    { cells: [{ markdown: "D" }, { markdown: "E" }, { markdown: "F" }] }
  ];
  it("inserts through spans in visual coordinates and preserves metadata", () => {
    const column = insertColumn(source, 1);
    expect(grid(column)).toEqual([
      ["A", "A", "A", "B"],
      ["A", "A", "A", "C"],
      ["D", "", "E", "F"]
    ]);
    expect(column[0]!.cells![0]!).toMatchObject({ colspan: 3, rowspan: 2 });
    const row = insertRow(source, 1);
    expect(grid(row)).toEqual([
      ["A", "A", "B"],
      ["A", "A", ""],
      ["A", "A", "C"],
      ["D", "E", "F"]
    ]);
    expect(row[0]!.cells![0]!.rowspan).toBe(3);
    expect(row[2]!.section).toBe("body");
    expect(source[0]!.cells[0]).toMatchObject({ rowspan: 2 });
  });
  it("deletes span origins and covered lines without losing retained content", () => {
    for (const index of [0, 1]) {
      const column = removeLine(source, "column", index);
      expect(grid(column)).toEqual([
        ["A", "B"],
        ["A", "C"],
        [index === 0 ? "E" : "D", "F"]
      ]);
      expect(column[0]!.cells![0]!.colspan).toBeUndefined();
      const row = removeLine(source, "row", index);
      expect(grid(row)).toEqual([
        ["A", "A", index === 0 ? "C" : "B"],
        ["D", "E", "F"]
      ]);
      expect(row[0]!.cells![0]!.rowspan).toBeUndefined();
    }
    expect(lineHasContent(source, "column", 1)).toBe(true); // E is discarded
    expect(lineHasContent([{ cells: [{ markdown: "kept", colspan: 2 }] }], "column", 1)).toBe(
      false
    );
    expect(
      lineHasContent([{ cells: [{ markdown: "kept", rowspan: 2 }] }, { cells: [] }], "row", 0)
    ).toBe(false);
  });
  it("merges only complete rectangles and splits them while retaining the top-left cell", () => {
    const rows = [
      { cells: [{ markdown: "keep" }, { markdown: "" }] },
      { cells: [{ markdown: "" }, { markdown: "" }] }
    ];
    const bounds = { top: 0, left: 0, right: 1, bottom: 1 };
    const entries = entriesForSelection(layoutRows(rows), bounds)!;
    expect(mergeHasDiscardedContent(entries, bounds)).toBe(false);
    const merged = mergeCells(rows, bounds);
    expect(grid(merged)).toEqual([
      ["keep", "keep"],
      ["keep", "keep"]
    ]);
    expect(entriesForSelection(layoutRows(merged), { ...bounds, right: 0 })).toBeNull();
    expect(grid(splitCell(merged, 1, 1))).toEqual([
      ["keep", ""],
      ["", ""]
    ]);
    rows[1]!.cells[1]!.markdown = "discard";
    expect(mergeHasDiscardedContent(entriesForSelection(layoutRows(rows), bounds)!, bounds)).toBe(
      true
    );
  });
  it("recognizes and toggles header cells covering an empty row", () => {
    const rows = [
      { cells: [{ markdown: "h", rowspan: 2, colspan: 2, is_header: true }] },
      { cells: [] }
    ];
    expect(normalizedRows(rows)[1]!.cells).toEqual([]);
    expect(isHeaderRow(layoutRows(rows), 1)).toBe(true);
    const toggled = toggleHeaderRow(rows, 1);
    expect(isHeaderRow(layoutRows(toggled), 1)).toBe(false);
    expect(isHeaderRow(layoutRows([{ cells: [] }]), 0)).toBe(false);
  });
  it("fills holes in front of existing cells without shifting them", () => {
    const rows = [
      { cells: [{ markdown: "A" }, { markdown: "B", rowspan: 2 }] },
      { cells: [{ markdown: "C" }] },
      { cells: [{ markdown: "D" }, { markdown: "E" }] }
    ];
    expect(grid(normalizedRows(rows))).toEqual([
      ["A", "B"],
      ["C", "B"],
      ["D", "E"]
    ]);
  });
  it("caps stored spans at the HTML limits instead of allocating from them", () => {
    const wide = layoutRows([{ cells: [{ markdown: "W", colspan: 250_000 }] }]);
    expect(wide.entries[0]!.colspan).toBe(1000);
    expect(wide.width).toBe(1000);

    // A row span ends at the last row: one row cannot become sixty-five thousand.
    const tall = layoutRows([{ cells: [{ markdown: "T", rowspan: 250_000 }] }]);
    expect(tall.entries[0]!.rowspan).toBe(1);
  });
  it("bounds a combined span on a one-row table to the table's own shape", () => {
    const source = [{ cells: [{ markdown: "A", colspan: 1000, rowspan: 65_534 }] }];
    const layout = layoutRows(source);
    expect(layout.entries[0]).toMatchObject({ row: 0, column: 0, colspan: 1000, rowspan: 1 });
    expect(layout.slots.size).toBe(1000);
    expect(layout.width).toBe(1000);

    const rows = normalizedRows(source);
    expect(rows).toHaveLength(1);
    // The stored span is preserved; only the layout is bounded by the table.
    expect(rows[0]!.cells).toEqual([{ markdown: "A", colspan: 1000, rowspan: 65_534 }]);
  });
});
