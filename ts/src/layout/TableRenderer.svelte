<script lang="ts">
  // Generic table renderer.
  //
  // Styling contract: this component emits semantic HTML and data attributes, and
  // carries no scoped styles, so a consumer restyles it by targeting
  // `[data-nightfire-block="table"]` and by overriding the `--nightfire-*` tokens.
  // Scoped styles are deliberately absent: they are exactly what a consumer cannot
  // reach.
  //
  // Two things the DATA owns rather than the theme: which cell edges carry a border,
  // and how a cell is aligned. Those are content decisions, so they are emitted as
  // data attributes (borders) and explicit alignment (text-align). Appearance stays
  // with the tokens.
  import { marked } from "marked";
  import { sanitizeHtml } from "../html.js";

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

  type TableRow = { section: string; cells: TableCell[] };

  type TableBlock = {
    data?: {
      caption?: string | null;
      rows?: TableRow[];
    };
  };

  interface Props {
    block: TableBlock;
  }

  let { block }: Props = $props();

  const caption = $derived(typeof block?.data?.caption === "string" ? block.data.caption : "");
  const rows = $derived(Array.isArray(block?.data?.rows) ? block.data.rows : []);

  function cellHtml(markdown: string): string {
    // Cell content is markdown by contract, so it renders through the same marked +
    // sanitize path as the markdown block rather than a second escaping scheme.
    const source = typeof markdown === "string" ? markdown : "";
    if (source.trim().length === 0) return "";
    return sanitizeHtml(marked.parse(source, { async: false }) as string);
  }

  function borderAttrs(borders?: CellBorders): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const edge of ["top", "bottom", "left", "right"] as const) {
      if (borders?.[edge]) attrs[`data-border-${edge}`] = "true";
    }
    return attrs;
  }

  function alignStyle(cell: TableCell): string | undefined {
    const parts: string[] = [];
    if (cell.horizontal_align) parts.push(`text-align:${cell.horizontal_align}`);
    if (cell.vertical_align) parts.push(`vertical-align:${cell.vertical_align}`);
    return parts.length > 0 ? parts.join(";") : undefined;
  }

  // Rows arrive grouped by section; consecutive rows sharing a section render as one
  // body group, and a section whose cells are marked as headers renders as a head
  // group so assistive technology reads the table's structure rather than a flat grid.
  const groups = $derived.by(() => {
    const out: { section: string; rows: TableRow[]; isHead: boolean }[] = [];
    for (const row of rows) {
      const isHead = row.cells.length > 0 && row.cells.every((cell) => cell.is_header === true);
      const last = out.at(-1);
      if (last && last.section === row.section && last.isHead === isHead) last.rows.push(row);
      else out.push({ section: row.section, rows: [row], isHead });
    }
    return out;
  });
</script>

{#if rows.length > 0}
  <table data-nightfire-block="table">
    {#if caption}
      <caption>{caption}</caption>
    {/if}
    {#each groups as group (group.section + group.rows.length)}
      {#if group.isHead}
        <thead data-section={group.section}>
          {#each group.rows as row}
            <tr>
              {#each row.cells as cell}
                <th
                  colspan={cell.colspan}
                  rowspan={cell.rowspan}
                  style={alignStyle(cell)}
                  {...borderAttrs(cell.borders)}
                >
                  {@html cellHtml(cell.markdown)}
                </th>
              {/each}
            </tr>
          {/each}
        </thead>
      {:else}
        <tbody data-section={group.section}>
          {#each group.rows as row}
            <tr>
              {#each row.cells as cell}
                <td
                  colspan={cell.colspan}
                  rowspan={cell.rowspan}
                  style={alignStyle(cell)}
                  {...borderAttrs(cell.borders)}
                >
                  {@html cellHtml(cell.markdown)}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      {/if}
    {/each}
  </table>
{/if}
