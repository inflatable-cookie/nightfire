<script lang="ts">
  // Generic table renderer.
  //
  // Styling contract: this component emits semantic HTML and data attributes, and
  // carries no scoped styles or design tokens, so a consumer restyles it by
  // targeting `[data-nightfire-block="table"]` (docs/knowledge/contracts/styling.md).
  //
  // Two things the DATA owns rather than the theme: which cell edges carry a border,
  // and how a cell is aligned. Those are content decisions, so they are emitted as
  // data attributes (borders) and explicit alignment (text-align). Appearance stays
  // with the consumer.
  import { renderSafeMarkdownHtml } from "../markup/safe-markdown";

  type CellBorders = { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };

  type TableCell = {
    markdown: string;
    is_header?: boolean;
    colspan?: number;
    rowspan?: number;
    horizontal_align?: string | null;
    vertical_align?: string | null;
    borders?: CellBorders;
  };

  // `section` is optional: a row without one groups with its neighbours.
  type TableRow = { section?: string; cells: Array<TableCell> };

  type TableBlock = {
    data?: {
      caption?: string | null;
      rows?: Array<TableRow>;
    };
  };

  interface Props {
    block: TableBlock;
  }

  let { block }: Props = $props();

  // Closed alignment vocabularies. An unrecognised value is dropped rather than
  // written into the style attribute, so stored data cannot inject CSS.
  const HORIZONTAL_ALIGNS: ReadonlySet<string> = new Set(["left", "center", "right", "justify"]);
  const VERTICAL_ALIGNS: ReadonlySet<string> = new Set(["top", "middle", "bottom", "baseline"]);

  const caption = $derived(typeof block?.data?.caption === "string" ? block.data.caption : "");

  // A row without a cell list, or a cell that is not an object, is malformed and
  // contributes nothing.
  const rows = $derived(
    Array.isArray(block?.data?.rows)
      ? block.data.rows
          .filter((row) => Array.isArray(row?.cells))
          .map((row) => ({
            section: row.section,
            cells: row.cells.filter((cell) => cell !== null && typeof cell === "object"),
          }))
      : []
  );

  function cellHtml(markdown: string): string {
    // Cell content is markdown by contract, so it renders through the same path as
    // the markdown block rather than a second escaping scheme.
    return renderSafeMarkdownHtml(typeof markdown === "string" ? markdown : "");
  }

  function borderAttrs(borders?: CellBorders): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const edge of ["top", "bottom", "left", "right"] as const) {
      if (borders?.[edge]) {attrs[`data-border-${edge}`] = "true";}
    }
    return attrs;
  }

  function alignStyle(cell: TableCell): string | undefined {
    const parts: Array<string> = [];
    if (cell.horizontal_align && HORIZONTAL_ALIGNS.has(cell.horizontal_align)) {
      parts.push(`text-align:${cell.horizontal_align}`);
    }
    if (cell.vertical_align && VERTICAL_ALIGNS.has(cell.vertical_align)) {
      parts.push(`vertical-align:${cell.vertical_align}`);
    }
    return parts.length > 0 ? parts.join(";") : undefined;
  }

  // A span is a whole number above one; anything else is left to the default.
  function spanValue(value: number | undefined): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value > 1 ? value : undefined;
  }

  // Rows arrive grouped by section; consecutive rows sharing a section render as one
  // body group, and a section whose cells are all marked as headers renders as a head
  // group so assistive technology reads the table's structure rather than a flat grid.
  const groups = $derived.by(() => {
    const out: Array<{ section: string | undefined; rows: typeof rows; isHead: boolean }> = [];
    for (const row of rows) {
      const isHead = row.cells.length > 0 && row.cells.every((cell) => cell.is_header === true);
      const last = out.at(-1);
      if (last && last.section === row.section && last.isHead === isHead) {last.rows.push(row);}
      else {out.push({ section: row.section, rows: [row], isHead });}
    }
    return out;
  });
</script>

{#snippet rowCells(row: { cells: TableCell[] })}
  <tr>
    {#each row.cells as cell}
      <!-- A header cell inside a body row stays a header, so a row header reads as one. -->
      <svelte:element
        this={cell.is_header === true ? "th" : "td"}
        colspan={spanValue(cell.colspan)}
        rowspan={spanValue(cell.rowspan)}
        style={alignStyle(cell)}
        {...borderAttrs(cell.borders)}
      >
        {@html cellHtml(cell.markdown)}
      </svelte:element>
    {/each}
  </tr>
{/snippet}

{#if rows.length > 0}
  <table data-nightfire-block="table">
    {#if caption}
      <caption>{caption}</caption>
    {/if}
    {#each groups as group, index (index)}
      {#if group.isHead}
        <thead data-section={group.section}>
          {#each group.rows as row}
            {@render rowCells(row)}
          {/each}
        </thead>
      {:else}
        <tbody data-section={group.section}>
          {#each group.rows as row}
            {@render rowCells(row)}
          {/each}
        </tbody>
      {/if}
    {/each}
  </table>
{/if}
