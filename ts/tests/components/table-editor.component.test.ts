// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "../vitest";
import { cleanup, fireEvent, render, within } from "../render";

import "../../src/editor-registrations";
import { getBlockEditor, isBlockContentEmpty } from "../../src/editor-registry";

const EditorComponent = getBlockEditor(undefined, "table");

afterEach(cleanup);

function tableBlock(rows?: unknown[]) {
  return {
    id: "nf_table",
    type: "table",
    version: "initial",
    data: rows ? { caption: "Quarterly **figures**", rows } : {},
  };
}

function lastBlock(onChange: ReturnType<typeof vi.fn>) {
  return onChange.mock.calls.at(-1)![0];
}

function expectRectangular(rows: any[], width: number) {
  const occupied = new Set<string>();
  rows.forEach((row, rowIndex) => {
    let column = 0;
    row.cells.forEach((cell: any) => {
      while (occupied.has(`${rowIndex}:${column}`)) column += 1;
      const colspan = cell.colspan ?? 1;
      const rowspan = cell.rowspan ?? 1;
      for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < colspan; columnOffset += 1) {
          const key = `${rowIndex + rowOffset}:${column + columnOffset}`;
          expect(occupied.has(key), `overlapping slot ${key}`).toBe(false);
          occupied.add(key);
        }
      }
      column += colspan;
    });
  });
  rows.forEach((_, rowIndex) => {
    expect(
      Array.from({ length: width }, (_unused, column) =>
        occupied.has(`${rowIndex}:${column}`),
      ),
    ).toEqual(Array.from({ length: width }, () => true));
  });
}

describe("nightfire/table editor", () => {
  it("registers the editor and answers emptiness from caption and cell markdown", () => {
    expect(EditorComponent).toBeTruthy();
    expect(isBlockContentEmpty(tableBlock())).toBe(true);
    expect(
      isBlockContentEmpty({ type: "table", data: { caption: "  caption  ", rows: [] } }),
    ).toBe(false);
    expect(
      isBlockContentEmpty({
        type: "table",
        data: { rows: [{ cells: [{ markdown: "  " }, { markdown: "value" }] }] },
      }),
    ).toBe(false);
  });

  it("starts empty data as a two-by-two grid with one roving tab stop", () => {
    const view = render(EditorComponent as any, { block: tableBlock(), onChange: vi.fn() });
    const grid = within(view.container).getByRole("grid", { name: "Table cells" });
    const cells = [
      ...within(grid).getAllByRole("columnheader"),
      ...within(grid).getAllByRole("gridcell"),
    ];

    expect(grid.getAttribute("aria-rowcount")).toBe("2");
    expect(grid.getAttribute("aria-colcount")).toBe("2");
    expect(cells).toHaveLength(4);
    expect(within(grid).getAllByRole("columnheader")).toHaveLength(2);
    expect(cells.filter((cell) => cell.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(cells.filter((cell) => cell.getAttribute("tabindex") === "-1")).toHaveLength(3);
  });

  it("moves by keyboard, enters raw markdown editing, and adds a row on final Tab", async () => {
    const onChange = vi.fn();
    const view = render(EditorComponent as any, { block: tableBlock(), onChange });
    const first = within(view.container).getByRole("columnheader", {
      name: "Row 1, column 1",
    });

    first.focus();
    await fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(
      within(view.container).getByRole("columnheader", { name: "Row 1, column 2" }),
    );

    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: "H" });
    const input = within(view.container).getByRole("textbox", {
      name: "Edit Row 1, column 2",
    }) as HTMLTextAreaElement;
    expect(document.activeElement).toBe(input);
    expect(lastBlock(onChange).data.rows[0].cells[1].markdown).toBe("H");

    await fireEvent.keyDown(input, { key: "Tab" });
    expect((document.activeElement as HTMLElement).dataset.tableCell).toBe("1-0");

    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowUp" });
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Enter" });
    const reopened = within(view.container).getByRole("textbox", {
      name: "Edit Row 1, column 1",
    });
    await fireEvent.keyDown(reopened, { key: "Escape" });
    expect(document.activeElement).toBe(
      within(view.container).getByRole("columnheader", { name: "Row 1, column 1" }),
    );

    const last = within(view.container).getByRole("gridcell", { name: "Row 2, column 2" });
    last.focus();
    await fireEvent.keyDown(last, { key: "Tab" });
    expect(lastBlock(onChange).data.rows).toHaveLength(3);
    expect(lastBlock(onChange).data.rows[2].cells).toHaveLength(2);
    expect(lastBlock(onChange).data.rows[2]).not.toHaveProperty("section");
  });

  it("renders sanitized markdown when a cell is not being edited", () => {
    const view = render(EditorComponent as any, {
      block: tableBlock([
        {
          cells: [
            {
              markdown:
                '<img src=x onerror="window.__tablePwned = true"><script>window.__tablePwned = true;</script>\n\n**Safe**',
            },
          ],
        },
      ]),
      onChange: vi.fn(),
    });

    const cell = within(view.container).getByRole("gridcell", { name: "Row 1, column 1" });
    expect(cell.innerHTML).not.toContain("onerror");
    expect(cell.querySelector("script")).toBeNull();
    expect(cell.querySelector("strong")?.textContent).toBe("Safe");
    expect((window as unknown as { __tablePwned?: boolean }).__tablePwned).toBeUndefined();
  });

  it("preserves unmanaged row and cell fields through structural and cell updates", async () => {
    const originalRows = [
      {
        section: "retained-section",
        row_extension: { retained: true },
        cells: [
          {
            markdown: "A",
            colspan: 2,
            cell_extension: "retained",
            borders: { top: true },
          },
          { markdown: "B" },
        ],
      },
      {
        section: "body",
        cells: [{ markdown: "" }, { markdown: "" }],
      },
    ];
    const onChange = vi.fn();
    const view = render(EditorComponent as any, {
      block: tableBlock(originalRows),
      onChange,
    });

    await fireEvent.click(within(view.container).getByRole("button", { name: "Bottom edge" }));
    const afterBorder = lastBlock(onChange);
    expect(afterBorder.id).toBe("nf_table");
    expect(afterBorder.data.rows[0].section).toBe("retained-section");
    expect(afterBorder.data.rows[0].row_extension).toEqual({ retained: true });
    expect(afterBorder.data.rows[0].cells[0]).toMatchObject({
      markdown: "A",
      colspan: 2,
      cell_extension: "retained",
      borders: { top: true, bottom: true },
    });

    await fireEvent.click(within(view.container).getByRole("button", { name: "Insert column right" }));
    const afterColumn = lastBlock(onChange);
    expect(afterColumn.data.rows[0].section).toBe("retained-section");
    expect(afterColumn.data.rows[0].cells[0].cell_extension).toBe("retained");
    expect(afterColumn.data.rows[0].cells).toHaveLength(3);
    expect(afterColumn.data.rows[0].cells[1].is_header).toBeUndefined();
  });

  it("writes row headers, alignment, and borders for the focused cell", async () => {
    const block = tableBlock([
      { cells: [{ markdown: "Header", is_header: true }, { markdown: "Amount", is_header: true }] },
      { cells: [{ markdown: "Body" }, { markdown: "10" }] },
    ]);
    const onChange = vi.fn();
    const view = render(EditorComponent as any, { block, onChange });
    const target = within(view.container).getByRole("gridcell", { name: "Row 2, column 1" });
    await fireEvent.focus(target);

    await fireEvent.click(within(view.container).getByRole("button", { name: "Mark header row" }));
    expect(lastBlock(onChange).data.rows[1].cells.every((cell: any) => cell.is_header)).toBe(true);

    const horizontal = within(view.container).getByLabelText("Horizontal alignment");
    await fireEvent.change(horizontal, { target: { value: "center" } });
    expect(lastBlock(onChange).data.rows[1].cells[0].horizontal_align).toBe("center");

    const vertical = within(view.container).getByLabelText("Vertical alignment");
    await fireEvent.change(vertical, { target: { value: "middle" } });
    expect(lastBlock(onChange).data.rows[1].cells[0].vertical_align).toBe("middle");

    await fireEvent.click(within(view.container).getByRole("button", { name: "Left edge" }));
    expect(lastBlock(onChange).data.rows[1].cells[0].borders).toEqual({ left: true });
  });

  it("removes empty structure immediately and confirms content-bearing removal in-page", async () => {
    const block = tableBlock([
      { cells: [{ markdown: "Keep" }, { markdown: "" }] },
      { cells: [{ markdown: "" }, { markdown: "" }] },
    ]);
    const onChange = vi.fn();
    const view = render(EditorComponent as any, { block, onChange });

    const emptyRowCell = within(view.container).getByRole("gridcell", {
      name: "Row 2, column 1",
    });
    emptyRowCell.focus();
    await fireEvent.click(within(view.container).getByRole("button", { name: "Remove row" }));
    expect(lastBlock(onChange).data.rows).toHaveLength(1);
    expect(within(view.container).queryByRole("alertdialog")).toBeNull();

    const contentView = render(EditorComponent as any, { block, onChange });
    const contentCell = within(contentView.container).getByRole("gridcell", {
      name: "Row 1, column 1",
    });
    contentCell.focus();
    const callCount = onChange.mock.calls.length;
    await fireEvent.click(
      within(contentView.container).getByRole("button", { name: "Remove row" }),
    );
    expect(onChange).toHaveBeenCalledTimes(callCount);
    const dialog = within(contentView.container).getByRole("alertdialog");
    expect(dialog.textContent).toContain("cannot be undone");

    await fireEvent.click(within(dialog).getByRole("button", { name: "Confirm removal" }));
    expect(lastBlock(onChange).data.rows).toHaveLength(1);
    expect(lastBlock(onChange).data.rows[0].cells[0].markdown).toBe("");
  });

  it("extends a rectangular selection by keyboard, merges it, and preserves row sections", async () => {
    const block = tableBlock([
      { section: "head", cells: [{ markdown: "" }, { markdown: "" }] },
      { section: "body", cells: [{ markdown: "" }, { markdown: "" }] },
    ]);
    const onChange = vi.fn();
    const view = render(EditorComponent as any, { block, onChange });
    const first = within(view.container).getByRole("gridcell", { name: "Row 1, column 1" });

    first.focus();
    await fireEvent.keyDown(first, { key: "ArrowRight", shiftKey: true });
    await fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "ArrowDown",
      shiftKey: true,
    });
    await fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "M",
      ctrlKey: true,
      shiftKey: true,
    });

    const merged = lastBlock(onChange);
    expect(merged.data.rows.map((row: any) => row.section)).toEqual(["head", "body"]);
    expect(merged.data.rows[0].cells).toEqual([
      expect.objectContaining({ markdown: "", colspan: 2, rowspan: 2 }),
    ]);
    expect(merged.data.rows[1].cells).toEqual([]);
    expectRectangular(merged.data.rows, 2);
  });

  it("round-trips both spans and splits back to a well-formed grid from the keyboard", async () => {
    const mergedBlock = tableBlock([
      {
        section: "head",
        cells: [
          { markdown: "Kept", is_header: true, colspan: 2, rowspan: 2 },
          { markdown: "Right", is_header: true },
        ],
      },
      { section: "body", cells: [{ markdown: "Below right" }] },
    ]);
    const onChange = vi.fn();
    const view = render(EditorComponent as any, { block: mergedBlock, onChange });
    const mergedCell = within(view.container).getByRole("columnheader", {
      name: "Row 1, column 1",
    });

    expect(mergedCell.getAttribute("aria-colspan")).toBe("2");
    expect(mergedCell.getAttribute("aria-rowspan")).toBe("2");
    await fireEvent.click(within(view.container).getByRole("button", { name: "Top edge" }));
    expect(lastBlock(onChange).data.rows[0].cells[0]).toMatchObject({
      colspan: 2,
      rowspan: 2,
      borders: { top: true },
    });
    mergedCell.focus();
    await fireEvent.keyDown(mergedCell, {
      key: "S",
      ctrlKey: true,
      shiftKey: true,
    });

    const split = lastBlock(onChange);
    expect(split.data.rows.map((row: any) => row.section)).toEqual(["head", "body"]);
    expect(split.data.rows[0].cells).toHaveLength(3);
    expect(split.data.rows[1].cells).toHaveLength(3);
    expect(split.data.rows[0].cells[0]).toMatchObject({ markdown: "Kept", is_header: true });
    expect(split.data.rows[0].cells.map((cell: any) => cell.markdown)).toEqual([
      "Kept",
      "",
      "Right",
    ]);
    expect(split.data.rows[1].cells.map((cell: any) => cell.markdown)).toEqual([
      "",
      "",
      "Below right",
    ]);
    expect(split.data.rows[0].cells[0]).not.toHaveProperty("colspan");
    expect(split.data.rows[0].cells[0]).not.toHaveProperty("rowspan");
    expectRectangular(split.data.rows, 3);
  });

  it("requires in-page confirmation before a merge can discard cell content", async () => {
    const block = tableBlock([
      { cells: [{ markdown: "Keep" }, { markdown: "Discard" }] },
      { cells: [{ markdown: "" }, { markdown: "" }] },
    ]);
    const onChange = vi.fn();
    const view = render(EditorComponent as any, { block, onChange });
    const first = within(view.container).getByRole("gridcell", { name: "Row 1, column 1" });

    first.focus();
    await fireEvent.keyDown(first, { key: "ArrowRight", shiftKey: true });
    await fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "M",
      ctrlKey: true,
      shiftKey: true,
    });

    expect(onChange).not.toHaveBeenCalled();
    const dialog = within(view.container).getByRole("alertdialog");
    expect(dialog.textContent).toContain("cannot be recovered");
    await fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(block.data.rows[0].cells).toHaveLength(2);

    await fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "M",
      ctrlKey: true,
      shiftKey: true,
    });
    await fireEvent.click(
      within(view.container).getByRole("button", { name: "Confirm merge" }),
    );
    expect(lastBlock(onChange).data.rows[0].cells).toEqual([
      expect.objectContaining({ markdown: "Keep", colspan: 2 }),
    ]);
    expectRectangular(lastBlock(onChange).data.rows, 2);
  });
});
