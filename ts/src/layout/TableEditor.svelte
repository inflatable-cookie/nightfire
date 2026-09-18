<script lang="ts">
  import { tick } from "svelte";
  import { Button, Select, TextInput } from "@inflatable-cookie/poodle-svelte";
  import { renderSafeMarkdownPreview } from "../markup/markdown-preview";

  type Edge = "top" | "right" | "bottom" | "left";
  type Borders = Partial<Record<Edge, boolean>>;
  type TableCell = Record<string, unknown> & {
    markdown?: string;
    is_header?: boolean;
    colspan?: number;
    rowspan?: number;
    horizontal_align?: string | null;
    vertical_align?: string | null;
    borders?: Borders;
  };
  type TableRow = Record<string, unknown> & { cells?: TableCell[] };
  type TableBlock = Record<string, unknown> & {
    type?: string;
    version?: string;
    data?: Record<string, unknown> & { caption?: string | null; rows?: TableRow[] };
  };

  interface Props {
    block: TableBlock;
    onChange?: (block: TableBlock) => void;
  }

  let { block, onChange = () => {} }: Props = $props();

  let focusRow = $state(0);
  let focusColumn = $state(0);
  let anchorRow = $state(0);
  let anchorColumn = $state(0);
  let editing = $state(false);
  let rootElement = $state<HTMLElement | null>(null);
  let confirmation = $state<
    { kind: "row" | "column"; index: number } | { kind: "merge" } | null
  >(null);

  type GridEntry = {
    cell: TableCell;
    cellIndex: number;
    row: number;
    column: number;
    colspan: number;
    rowspan: number;
  };

  type GridLayout = {
    entries: GridEntry[];
    slots: Map<string, GridEntry>;
    width: number;
  };

  const horizontalOptions = [
    { value: "", label: "Default" },
    { value: "left", label: "Left" },
    { value: "center", label: "Centre" },
    { value: "right", label: "Right" },
  ];
  const verticalOptions = [
    { value: "", label: "Default" },
    { value: "top", label: "Top" },
    { value: "middle", label: "Middle" },
    { value: "bottom", label: "Bottom" },
  ];

  function emptyCell(isHeader = false): TableCell {
    return { markdown: "", ...(isHeader ? { is_header: true } : {}) };
  }

  function startingRows(): TableRow[] {
    return [
      { cells: [emptyCell(true), emptyCell(true)] },
      { cells: [emptyCell(), emptyCell()] },
    ];
  }

  function sourceRows(): TableRow[] {
    return Array.isArray(block?.data?.rows) && block.data.rows.length > 0
      ? block.data.rows
      : startingRows();
  }

  const rows = $derived(sourceRows());
  const layout = $derived(layoutRows(rows));
  const columnCount = $derived(layout.width);
  const activeRow = $derived(Math.min(focusRow, rows.length - 1));
  const activeColumn = $derived(Math.min(focusColumn, columnCount - 1));
  const focusedEntry = $derived(entryAt(layout, activeRow, activeColumn));
  const focusedCell = $derived(focusedEntry?.cell ?? emptyCell());
  const selection = $derived(selectionBounds());
  const mergeEntries = $derived(entriesForSelection(layout, selection));
  const canMerge = $derived(mergeEntries !== null && mergeEntries.length > 1);
  const canSplit = $derived(
    focusedEntry !== undefined && (focusedEntry.colspan > 1 || focusedEntry.rowspan > 1),
  );

  function positiveSpan(value: unknown): number {
    return typeof value === "number" && Number.isInteger(value) && value > 1 ? value : 1;
  }

  function slotKey(row: number, column: number): string {
    return `${row}:${column}`;
  }

  function layoutRows(source: TableRow[]): GridLayout {
    const entries: GridEntry[] = [];
    const slots = new Map<string, GridEntry>();
    let width = 1;

    source.forEach((row, rowIndex) => {
      const cells = Array.isArray(row.cells) ? row.cells : [];
      let column = 0;
      cells.forEach((cell, cellIndex) => {
        const colspan = positiveSpan(cell.colspan);
        const rowspan = positiveSpan(cell.rowspan);
        while (true) {
          let fits = true;
          for (let rowOffset = 0; rowOffset < rowspan && fits; rowOffset += 1) {
            for (let columnOffset = 0; columnOffset < colspan; columnOffset += 1) {
              if (slots.has(slotKey(rowIndex + rowOffset, column + columnOffset))) {
                fits = false;
                break;
              }
            }
          }
          if (fits) break;
          column += 1;
        }

        const entry = { cell, cellIndex, row: rowIndex, column, colspan, rowspan };
        entries.push(entry);
        for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
          for (let columnOffset = 0; columnOffset < colspan; columnOffset += 1) {
            slots.set(slotKey(rowIndex + rowOffset, column + columnOffset), entry);
          }
        }
        column += colspan;
        width = Math.max(width, column);
      });
    });

    return { entries, slots, width };
  }

  function entryAt(source: GridLayout, row: number, column: number): GridEntry | undefined {
    return source.slots.get(slotKey(row, column));
  }

  function normalizedRows(source = rows): TableRow[] {
    const nextRows = source.map((row) => ({
      ...row,
      cells: Array.isArray(row.cells) ? row.cells.map((cell) => ({ ...cell })) : [],
    }));
    const initialLayout = layoutRows(nextRows);
    const requiredRows = Math.max(
      nextRows.length,
      ...initialLayout.entries.map((entry) => entry.row + entry.rowspan),
    );
    while (nextRows.length < requiredRows) nextRows.push({ cells: [] });
    const width = initialLayout.width;

    for (let rowIndex = 0; rowIndex < nextRows.length; rowIndex += 1) {
      while (true) {
        const current = layoutRows(nextRows);
        const hasHole = Array.from({ length: width }, (_, column) => column).some(
          (column) => !current.slots.has(slotKey(rowIndex, column)),
        );
        if (!hasHole) break;
        nextRows[rowIndex].cells?.push(emptyCell());
      }
    }
    return nextRows;
  }

  function emit(nextRows: TableRow[], dataUpdates: Record<string, unknown> = {}): void {
    onChange({
      ...block,
      type: block?.type ?? "table",
      version: block?.version ?? "initial",
      data: {
        ...(block?.data ?? {}),
        ...dataUpdates,
        rows: nextRows,
      },
    });
  }

  function updateCell(
    rowIndex: number,
    columnIndex: number,
    update: (cell: TableCell) => TableCell,
  ): void {
    const nextRows = normalizedRows();
    const entry = entryAt(layoutRows(nextRows), rowIndex, columnIndex);
    if (!entry) return;
    const row = nextRows[entry.row];
    if (!row || !Array.isArray(row.cells)) return;
    row.cells[entry.cellIndex] = update({ ...row.cells[entry.cellIndex] });
    emit(nextRows);
  }

  function selectionBounds(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    const anchor = entryAt(layout, anchorRow, anchorColumn);
    const focus = focusedEntry;
    const anchorBottom = anchor ? anchor.row + anchor.rowspan - 1 : anchorRow;
    const anchorRight = anchor ? anchor.column + anchor.colspan - 1 : anchorColumn;
    const focusBottom = focus ? focus.row + focus.rowspan - 1 : activeRow;
    const focusRight = focus ? focus.column + focus.colspan - 1 : activeColumn;
    return {
      top: Math.min(anchor?.row ?? anchorRow, focus?.row ?? activeRow),
      right: Math.max(anchorRight, focusRight),
      bottom: Math.max(anchorBottom, focusBottom),
      left: Math.min(anchor?.column ?? anchorColumn, focus?.column ?? activeColumn),
    };
  }

  function entriesForSelection(
    source: GridLayout,
    bounds: { top: number; right: number; bottom: number; left: number },
  ): GridEntry[] | null {
    const selected = new Set<GridEntry>();
    for (let row = bounds.top; row <= bounds.bottom; row += 1) {
      for (let column = bounds.left; column <= bounds.right; column += 1) {
        const entry = entryAt(source, row, column);
        if (!entry) return null;
        if (
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

  function isSelected(entry: GridEntry): boolean {
    return (
      entry.row >= selection.top &&
      entry.column >= selection.left &&
      entry.row + entry.rowspan - 1 <= selection.bottom &&
      entry.column + entry.colspan - 1 <= selection.right
    );
  }

  function requestMerge(): void {
    if (!canMerge || !mergeEntries) return;
    if (mergeEntries.some((entry) => hasContent(entry.cell))) confirmation = { kind: "merge" };
    else mergeSelection();
  }

  function mergeSelection(): void {
    const nextRows = normalizedRows();
    const nextLayout = layoutRows(nextRows);
    const selected = entriesForSelection(nextLayout, selection);
    if (!selected || selected.length <= 1) return;
    const topLeft = selected.find(
      (entry) => entry.row === selection.top && entry.column === selection.left,
    );
    if (!topLeft) return;

    const removals = selected
      .filter((entry) => entry !== topLeft)
      .sort((a, b) => b.row - a.row || b.cellIndex - a.cellIndex);
    for (const entry of removals) nextRows[entry.row].cells?.splice(entry.cellIndex, 1);

    const topLeftCells = nextRows[topLeft.row].cells;
    if (!topLeftCells) return;
    const mergedCell = { ...topLeftCells[topLeft.cellIndex] };
    const colspan = selection.right - selection.left + 1;
    const rowspan = selection.bottom - selection.top + 1;
    if (colspan > 1) mergedCell.colspan = colspan;
    else delete mergedCell.colspan;
    if (rowspan > 1) mergedCell.rowspan = rowspan;
    else delete mergedCell.rowspan;
    topLeftCells[topLeft.cellIndex] = mergedCell;

    confirmation = null;
    anchorRow = selection.top;
    anchorColumn = selection.left;
    focusRow = selection.top;
    focusColumn = selection.left;
    emit(nextRows);
    focusCell();
  }

  function splitCell(): void {
    const nextRows = normalizedRows();
    const nextLayout = layoutRows(nextRows);
    const entry = entryAt(nextLayout, activeRow, activeColumn);
    if (!entry || (entry.colspan === 1 && entry.rowspan === 1)) return;
    const original = { ...entry.cell };
    delete original.colspan;
    delete original.rowspan;

    const positioned = nextLayout.entries
      .filter((candidate) => candidate !== entry)
      .map((candidate) => ({
        row: candidate.row,
        column: candidate.column,
        cell: { ...candidate.cell },
      }));
    positioned.push({ row: entry.row, column: entry.column, cell: original });
    for (let rowOffset = 0; rowOffset < entry.rowspan; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < entry.colspan; columnOffset += 1) {
        if (rowOffset !== 0 || columnOffset !== 0) {
          positioned.push({
            row: entry.row + rowOffset,
            column: entry.column + columnOffset,
            cell: emptyCell(original.is_header === true),
          });
        }
      }
    }

    for (let row = 0; row < nextRows.length; row += 1) {
      nextRows[row].cells = positioned
        .filter((item) => item.row === row)
        .sort((a, b) => a.column - b.column)
        .map((item) => item.cell);
    }

    anchorRow = entry.row;
    anchorColumn = entry.column;
    emit(nextRows);
    focusCell();
  }

  function setCaption(caption: string): void {
    const nextData = { ...(block?.data ?? {}) };
    if (caption.length > 0) nextData.caption = caption;
    else delete nextData.caption;
    emit(normalizedRows(), nextData);
  }

  function setMarkdown(rowIndex: number, columnIndex: number, markdown: string): void {
    updateCell(rowIndex, columnIndex, (cell) => ({ ...cell, markdown }));
  }

  function setAlignment(field: "horizontal_align" | "vertical_align", value: string): void {
    updateCell(activeRow, activeColumn, (cell) => {
      if (value.length > 0) cell[field] = value;
      else delete cell[field];
      return cell;
    });
  }

  function toggleBorder(edge: Edge): void {
    updateCell(activeRow, activeColumn, (cell) => {
      const borders = { ...(cell.borders ?? {}) };
      if (borders[edge]) delete borders[edge];
      else borders[edge] = true;
      if (Object.keys(borders).length > 0) cell.borders = borders;
      else delete cell.borders;
      return cell;
    });
  }

  function clearBorders(): void {
    updateCell(activeRow, activeColumn, (cell) => {
      delete cell.borders;
      return cell;
    });
  }

  function toggleHeaderRow(): void {
    const nextRows = normalizedRows();
    const cells = nextRows[activeRow]?.cells;
    if (!Array.isArray(cells)) return;
    const makeHeader = !cells.every((cell) => cell.is_header === true);
    nextRows[activeRow] = {
      ...nextRows[activeRow],
      cells: cells.map((cell) => {
        const next = { ...cell };
        if (makeHeader) next.is_header = true;
        else delete next.is_header;
        return next;
      }),
    };
    emit(nextRows);
  }

  function insertRow(offset: 0 | 1): void {
    const nextRows = normalizedRows();
    const index = activeRow + offset;
    nextRows.splice(index, 0, { cells: Array.from({ length: columnCount }, () => emptyCell()) });
    focusRow = index;
    emit(nextRows);
    focusCell();
  }

  function insertColumn(offset: 0 | 1): void {
    const nextRows = normalizedRows();
    const index = activeColumn + offset;
    for (const row of nextRows) {
      const cells = row.cells ?? [];
      const isHeader = cells.every((cell) => cell.is_header === true);
      cells.splice(index, 0, emptyCell(isHeader));
      row.cells = cells;
    }
    focusColumn = index;
    emit(nextRows);
    focusCell();
  }

  function rowHasContent(index: number): boolean {
    return normalizedRows()[index]?.cells?.some(hasContent) ?? false;
  }

  function columnHasContent(index: number): boolean {
    return normalizedRows().some((row) => row.cells?.[index] && hasContent(row.cells[index]));
  }

  function hasContent(cell: TableCell): boolean {
    return typeof cell.markdown === "string" && cell.markdown.trim().length > 0;
  }

  function requestRemove(kind: "row" | "column"): void {
    const index = kind === "row" ? activeRow : activeColumn;
    const hasDestructiveContent =
      kind === "row" ? rowHasContent(index) : columnHasContent(index);
    if (hasDestructiveContent) confirmation = { kind, index };
    else remove(kind, index);
  }

  function remove(kind: "row" | "column", index: number): void {
    const nextRows = normalizedRows();
    if (kind === "row") {
      if (nextRows.length <= 1) return;
      nextRows.splice(index, 1);
      focusRow = Math.min(index, nextRows.length - 1);
    } else {
      if (columnCount <= 1) return;
      for (const row of nextRows) row.cells?.splice(index, 1);
      focusColumn = Math.min(index, columnCount - 2);
    }
    confirmation = null;
    emit(nextRows);
    focusCell();
  }

  async function focusCell(): Promise<void> {
    editing = false;
    await tick();
    rootElement
      ?.querySelector<HTMLElement>(
        `[data-table-cell="${focusRow}-${focusColumn}"]`,
      )
      ?.focus();
  }

  async function enterEdit(initial?: string): Promise<void> {
    editing = true;
    if (initial !== undefined) setMarkdown(activeRow, activeColumn, initial);
    await tick();
    rootElement
      ?.querySelector<HTMLTextAreaElement>(
        `[data-table-input="${activeRow}-${activeColumn}"]`,
      )
      ?.focus();
  }

  function move(row: number, column: number, extend = false): void {
    const targetRow = Math.max(0, Math.min(row, rows.length - 1));
    const targetColumn = Math.max(0, Math.min(column, columnCount - 1));
    const target = entryAt(layout, targetRow, targetColumn);
    if (!target) return;
    focusRow = target.row;
    focusColumn = target.column;
    if (!extend) {
      anchorRow = target.row;
      anchorColumn = target.column;
    }
    focusCell();
  }

  function moveByTab(direction: -1 | 1): void {
    const entries = layout.entries;
    const index = focusedEntry ? entries.indexOf(focusedEntry) : 0;
    const nextIndex = index + direction;
    if (nextIndex < 0) move(entries[0]?.row ?? 0, entries[0]?.column ?? 0);
    else if (nextIndex >= entries.length) insertRow(1);
    else move(entries[nextIndex].row, entries[nextIndex].column);
  }

  function handleCellKeydown(event: KeyboardEvent): void {
    const entry = focusedEntry;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "m") {
      requestMerge();
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "s"
    ) {
      splitCell();
    } else if (event.key === "ArrowUp") move(activeRow - 1, activeColumn, event.shiftKey);
    else if (event.key === "ArrowDown") {
      move(activeRow + (entry?.rowspan ?? 1), activeColumn, event.shiftKey);
    } else if (event.key === "ArrowLeft") move(activeRow, activeColumn - 1, event.shiftKey);
    else if (event.key === "ArrowRight") {
      move(activeRow, activeColumn + (entry?.colspan ?? 1), event.shiftKey);
    }
    else if (event.key === "Enter") enterEdit();
    else if (event.key === "Tab") {
      event.preventDefault();
      moveByTab(event.shiftKey ? -1 : 1);
      return;
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      enterEdit(event.key);
    } else {
      return;
    }
    event.preventDefault();
  }

  function handleEditorKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      focusCell();
      return;
    }
    if (event.key !== "Tab") return;

    event.preventDefault();
    moveByTab(event.shiftKey ? -1 : 1);
  }

  function cellLabel(rowIndex: number, columnIndex: number): string {
    return `Row ${rowIndex + 1}, column ${columnIndex + 1}`;
  }
</script>

<div class="underlay-table-editor" bind:this={rootElement}>
  <TextInput
    id="nightfire-table-caption"
    placeholder="Table caption (optional)"
    value={typeof block?.data?.caption === "string" ? block.data.caption : ""}
    onValueChange={setCaption}
  />

  <div class="underlay-table-editor__scroller">
    <div
      class="underlay-table-editor__grid"
      role="grid"
      aria-label="Table cells"
      aria-rowcount={rows.length}
      aria-colcount={columnCount}
      style:--nightfire-table-columns={columnCount}
    >
      {#each rows as _, rowIndex}
        <div class="underlay-table-editor__row" role="row">
          {#each layout.entries.filter((entry) => entry.row === rowIndex) as entry}
            {@const cell = entry.cell}
            {@const isActive = entry.row === activeRow && entry.column === activeColumn}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              class="underlay-table-editor__cell"
              class:underlay-table-editor__cell--active={isActive || isSelected(entry)}
              role={cell.is_header === true ? "columnheader" : "gridcell"}
              aria-label={cellLabel(entry.row, entry.column)}
              aria-selected={isSelected(entry)}
              aria-colspan={entry.colspan > 1 ? entry.colspan : undefined}
              aria-rowspan={entry.rowspan > 1 ? entry.rowspan : undefined}
              tabindex={isActive && !editing ? 0 : -1}
              data-table-cell={`${entry.row}-${entry.column}`}
              style={`grid-column: ${entry.column + 1} / span ${entry.colspan}; grid-row: ${entry.row + 1} / span ${entry.rowspan}`}
              onpointerdown={(event) => {
                if (!event.shiftKey) {
                  anchorRow = entry.row;
                  anchorColumn = entry.column;
                }
              }}
              onfocus={() => {
                focusRow = entry.row;
                focusColumn = entry.column;
              }}
              onkeydown={handleCellKeydown}
              ondblclick={() => enterEdit()}
            >
              {#if isActive && editing}
                <textarea
                  class="underlay-table-editor__cell-input"
                  aria-label={`Edit ${cellLabel(entry.row, entry.column)}`}
                  data-table-input={`${entry.row}-${entry.column}`}
                  value={typeof cell.markdown === "string" ? cell.markdown : ""}
                  oninput={(event) =>
                    setMarkdown(
                      entry.row,
                      entry.column,
                      (event.currentTarget as HTMLTextAreaElement).value,
                    )}
                  onkeydown={handleEditorKeydown}
                ></textarea>
              {:else if typeof cell.markdown === "string" && cell.markdown.length > 0}
                <div class="underlay-table-editor__preview">
                  {@html renderSafeMarkdownPreview(cell.markdown)}
                </div>
              {:else}
                <span class="underlay-table-editor__empty-cell">Empty</span>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <div class="underlay-table-editor__controls" aria-label="Table controls">
    <fieldset>
      <legend>
        Selected rows {selection.top + 1}–{selection.bottom + 1}, columns {selection.left + 1}–{selection.right + 1}
      </legend>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canMerge}
        onClick={requestMerge}
      >
        Merge cells
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canSplit}
        onClick={splitCell}
      >
        Split cell
      </Button>
    </fieldset>

    <fieldset>
      <legend>Focused row {activeRow + 1}</legend>
      <Button type="button" variant="secondary" size="sm" onClick={() => insertRow(0)}>
        Insert row above
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => insertRow(1)}>
        Insert row below
      </Button>
      <Button
        type="button"
        variant="ghost"
        tone="danger"
        size="sm"
        disabled={rows.length <= 1}
        onClick={() => requestRemove("row")}
      >
        Remove row
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={toggleHeaderRow}>
        {rows[activeRow]?.cells?.every((cell) => cell.is_header === true)
          ? "Unmark header row"
          : "Mark header row"}
      </Button>
    </fieldset>

    <fieldset>
      <legend>Focused column {activeColumn + 1}</legend>
      <Button type="button" variant="secondary" size="sm" onClick={() => insertColumn(0)}>
        Insert column left
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => insertColumn(1)}>
        Insert column right
      </Button>
      <Button
        type="button"
        variant="ghost"
        tone="danger"
        size="sm"
        disabled={columnCount <= 1}
        onClick={() => requestRemove("column")}
      >
        Remove column
      </Button>
    </fieldset>

    <fieldset>
      <legend>Cell alignment</legend>
      <Select
        value={typeof focusedCell.horizontal_align === "string" ? focusedCell.horizontal_align : ""}
        options={horizontalOptions}
        ariaLabel="Horizontal alignment"
        onValueChange={(value: string) => setAlignment("horizontal_align", value)}
      />
      <Select
        value={typeof focusedCell.vertical_align === "string" ? focusedCell.vertical_align : ""}
        options={verticalOptions}
        ariaLabel="Vertical alignment"
        onValueChange={(value: string) => setAlignment("vertical_align", value)}
      />
    </fieldset>

    <fieldset>
      <legend>Cell borders</legend>
      {#each ["top", "right", "bottom", "left"] as edge}
        <Button
          type="button"
          variant={focusedCell.borders?.[edge as Edge] ? "primary" : "secondary"}
          size="sm"
          pressed={focusedCell.borders?.[edge as Edge] === true}
          onClick={() => toggleBorder(edge as Edge)}
        >
          {edge[0].toUpperCase() + edge.slice(1)} edge
        </Button>
      {/each}
      <Button type="button" variant="ghost" size="sm" onClick={clearBorders}>
        Clear borders
      </Button>
    </fieldset>
  </div>

  {#if confirmation}
    <div
      class="underlay-table-editor__confirmation"
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="nightfire-table-confirmation-title"
    >
      <p id="nightfire-table-confirmation-title">
        {#if confirmation.kind === "merge"}
          Merge these cells? Their content cannot be recovered.
        {:else}
          Remove {confirmation.kind} {confirmation.index + 1}? It contains content and cannot be undone.
        {/if}
      </p>
      <div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            confirmation = null;
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          tone="danger"
          onClick={() => {
            if (confirmation?.kind === "merge") mergeSelection();
            else if (confirmation) remove(confirmation.kind, confirmation.index);
          }}
        >
          {confirmation.kind === "merge" ? "Confirm merge" : "Confirm removal"}
        </Button>
      </div>
    </div>
  {/if}
</div>

<style>
  .underlay-table-editor {
    display: grid;
    gap: var(--nightfire-space-3, 0.75rem);
  }

  .underlay-table-editor__scroller {
    overflow-x: auto;
  }

  .underlay-table-editor__grid {
    display: grid;
    grid-template-columns: repeat(var(--nightfire-table-columns), minmax(10rem, 1fr));
    min-width: 100%;
  }

  .underlay-table-editor__row {
    display: contents;
  }

  .underlay-table-editor__cell {
    min-width: 10rem;
    padding: var(--nightfire-space-2, 0.5rem);
    border: 1px solid var(--nightfire-color-border-subtle, currentColor);
    vertical-align: top;
    overflow-wrap: anywhere;
    cursor: text;
  }

  .underlay-table-editor__cell:focus,
  .underlay-table-editor__cell--active {
    outline: 3px solid var(--nightfire-color-focus, currentColor);
    outline-offset: -3px;
  }

  .underlay-table-editor__cell-input {
    box-sizing: border-box;
    width: 100%;
    min-height: 5rem;
    resize: vertical;
    font: inherit;
  }

  .underlay-table-editor__preview :global(:first-child) {
    margin-top: 0;
  }

  .underlay-table-editor__preview :global(:last-child) {
    margin-bottom: 0;
  }

  .underlay-table-editor__empty-cell {
    color: var(--nightfire-color-text-muted, currentColor);
    font-style: italic;
  }

  .underlay-table-editor__controls {
    display: grid;
    gap: var(--nightfire-space-2, 0.5rem);
  }

  .underlay-table-editor__controls fieldset {
    display: flex;
    flex-wrap: wrap;
    gap: var(--nightfire-space-2, 0.5rem);
    margin: 0;
    padding: var(--nightfire-space-2, 0.5rem);
    border: 1px solid var(--nightfire-color-border-subtle, currentColor);
  }

  .underlay-table-editor__confirmation {
    display: grid;
    gap: var(--nightfire-space-2, 0.5rem);
    padding: var(--nightfire-space-3, 0.75rem);
    border: 1px solid var(--nightfire-color-danger, currentColor);
  }

  .underlay-table-editor__confirmation p {
    margin: 0;
  }

  .underlay-table-editor__confirmation div {
    display: flex;
    gap: var(--nightfire-space-2, 0.5rem);
  }
</style>
