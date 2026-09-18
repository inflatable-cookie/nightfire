<script lang="ts">
  import { tick } from "svelte";
  import { Button, Select, TextInput } from "@inflatable-cookie/poodle-svelte";
  import { renderSafeMarkdownPreview } from "../markup/markdown-preview";

  type Edge = "top" | "right" | "bottom" | "left";
  type Borders = Partial<Record<Edge, boolean>>;
  type TableCell = Record<string, unknown> & {
    markdown?: string;
    is_header?: boolean;
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
  let editing = $state(false);
  let rootElement = $state<HTMLElement | null>(null);
  let confirmation = $state<{ kind: "row" | "column"; index: number } | null>(null);

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
  const columnCount = $derived(
    Math.max(1, ...rows.map((row) => (Array.isArray(row.cells) ? row.cells.length : 0))),
  );
  const activeRow = $derived(Math.min(focusRow, rows.length - 1));
  const activeColumn = $derived(Math.min(focusColumn, columnCount - 1));
  const focusedCell = $derived(cellAt(rows, activeRow, activeColumn));

  function cellAt(source: TableRow[], rowIndex: number, columnIndex: number): TableCell {
    const cells = source[rowIndex]?.cells;
    return Array.isArray(cells) && cells[columnIndex] ? cells[columnIndex] : emptyCell();
  }

  function normalizedRows(source = rows): TableRow[] {
    const width = Math.max(
      1,
      ...source.map((row) => (Array.isArray(row.cells) ? row.cells.length : 0)),
    );
    return source.map((row) => {
      const cells = Array.isArray(row.cells) ? row.cells.map((cell) => ({ ...cell })) : [];
      while (cells.length < width) cells.push(emptyCell());
      return { ...row, cells };
    });
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
    const row = nextRows[rowIndex];
    if (!row || !Array.isArray(row.cells)) return;
    row.cells[columnIndex] = update({ ...row.cells[columnIndex] });
    emit(nextRows);
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

  function move(row: number, column: number): void {
    focusRow = Math.max(0, Math.min(row, rows.length - 1));
    focusColumn = Math.max(0, Math.min(column, columnCount - 1));
    focusCell();
  }

  function handleCellKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowUp") move(activeRow - 1, activeColumn);
    else if (event.key === "ArrowDown") move(activeRow + 1, activeColumn);
    else if (event.key === "ArrowLeft") move(activeRow, activeColumn - 1);
    else if (event.key === "ArrowRight") move(activeRow, activeColumn + 1);
    else if (event.key === "Enter") enterEdit();
    else if (event.key === "Tab") {
      event.preventDefault();
      const flatIndex = activeRow * columnCount + activeColumn + (event.shiftKey ? -1 : 1);
      if (flatIndex < 0) move(0, 0);
      else if (flatIndex >= rows.length * columnCount) insertRow(1);
      else move(Math.floor(flatIndex / columnCount), flatIndex % columnCount);
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
    const flatIndex = activeRow * columnCount + activeColumn + (event.shiftKey ? -1 : 1);
    if (flatIndex < 0) move(0, 0);
    else if (flatIndex >= rows.length * columnCount) insertRow(1);
    else move(Math.floor(flatIndex / columnCount), flatIndex % columnCount);
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
    >
      {#each rows as row, rowIndex}
        <div class="underlay-table-editor__row" role="row">
          {#each Array(columnCount) as _, columnIndex}
            {@const cell = cellAt(rows, rowIndex, columnIndex)}
            {@const isActive = rowIndex === activeRow && columnIndex === activeColumn}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              class="underlay-table-editor__cell"
              class:underlay-table-editor__cell--active={isActive}
              role={cell.is_header === true ? "columnheader" : "gridcell"}
              aria-label={cellLabel(rowIndex, columnIndex)}
              aria-selected={isActive}
              tabindex={isActive && !editing ? 0 : -1}
              data-table-cell={`${rowIndex}-${columnIndex}`}
              onfocus={() => {
                focusRow = rowIndex;
                focusColumn = columnIndex;
              }}
              onkeydown={handleCellKeydown}
              ondblclick={() => enterEdit()}
            >
              {#if isActive && editing}
                <textarea
                  class="underlay-table-editor__cell-input"
                  aria-label={`Edit ${cellLabel(rowIndex, columnIndex)}`}
                  data-table-input={`${rowIndex}-${columnIndex}`}
                  value={typeof cell.markdown === "string" ? cell.markdown : ""}
                  oninput={(event) =>
                    setMarkdown(
                      rowIndex,
                      columnIndex,
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
        Remove {confirmation.kind} {confirmation.index + 1}? It contains content and cannot be undone.
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
          onClick={() => confirmation && remove(confirmation.kind, confirmation.index)}
        >
          Confirm removal
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
    display: table;
    min-width: 100%;
    border-collapse: collapse;
  }

  .underlay-table-editor__row {
    display: table-row;
  }

  .underlay-table-editor__cell {
    display: table-cell;
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
