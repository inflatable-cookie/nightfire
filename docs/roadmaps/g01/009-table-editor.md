# g01.009 Table Editor

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`, `docs/contracts/003-styling-and-restyling.md`
Depends on: g01.012 — same declaration and catalog files
UI classification: workflow change — full brief below
Ready state: ready — the four material questions were settled by the operator on 2026-09-18

## Outcome

`table` becomes authorable. It renders today with no editor, so the only way to produce one is to
hand-write its JSON. This lane adds a direct-manipulation grid: type into cells, add and remove rows
and columns, mark header rows, set alignment, and set per-cell edge borders.

## Context

The renderer is complete and stays as it is. It supports a caption, rows grouped by `section`,
per-cell markdown, a header flag, spans, horizontal and vertical alignment, and per-edge borders.

Poodle's `Table` and `DataTable` are display components — columns, rows, filtering, pagination — so
there is nothing to reuse for authoring. Poodle's rich-text table commands (`insert-table`,
`add-row`, `add-column`, `delete-table`) are the proven interaction vocabulary, so the grid's labels
and actions mirror them.

The package has **no editor history facility**. `rich_text` gets undo from Poodle; the markdown editor
gets it from the browser. A grid of our own has neither, which is the largest risk in this lane and is
answered by construction rather than by undo (see Decisions).

## The operator's decisions

1. **Direct grid**, not a structured field editor and not a hybrid.
2. **Cell content is markdown.** The renderer parses and sanitizes markdown, and a rich-text cell
   would be a different content model.
3. **Per-edge borders are needed; named sections are not.**
4. **No column widths.** Revisit later if a real need appears.

## Target workflow

**Entry.** A new table block starts as a two-column, two-row grid whose first row is a header row, so
the author has somewhere to type immediately and an obvious way to grow.

**Editing.** One cell has focus. Arrow keys move a cell at a time; Tab and Shift+Tab move forward and
back, adding a row when Tab leaves the last cell. Typing, or Enter on the focused cell, enters edit
mode; Escape leaves it. While editing, the cell shows raw markdown in a plain text field. While not
editing, the cell renders its markdown through the same sanitize path the renderer uses, so what the
author sees is what the reader gets.

**Structure.** Row and column controls sit on the focused row and column: insert above and below,
insert left and right, remove. Removing a row or column asks for confirmation when any cell in it
holds content, because there is no undo.

**Header rows.** A per-row toggle sets `is_header` on every cell in that row at once. The renderer
infers the head group when a row's cells are all headers, so the toggle is a row-level operation, not
a per-cell one, and more than one header row stays possible.

**Alignment.** The focused cell carries horizontal (left, centre, right) and vertical (top, middle,
bottom) controls, writing `horizontal_align` and `vertical_align`.

**Borders.** The focused cell carries four edge toggles — top, right, bottom, left — writing
`borders`, plus one action that clears all four. This is the content-presentational fact contract 003
rule 3 keeps in the data, so the control belongs here and the appearance does not.

**Sections.** Not authorable. The editor writes one section value for every row and exposes no
control. Rows that arrive with a section value must **round-trip unchanged**: the editor may not
silently rewrite a field it does not manage.

**Not in this lane.** Spans, which are [g01.015](015-table-cell-spans.md); column widths; named
sections; and any styling of the grid itself beyond the editor's own chrome.

## Presentation direction

The grid reuses the editor chrome the other block editors already use rather than inventing a second
visual language: Poodle controls for the row, column, alignment and border actions, and the existing
field shell for the block's caption. The editor may carry scoped styles, as the other editors do; the
**renderer's** appearance rules are untouched.

## States, content ranges, and input envelope

- Empty table → the starting grid, never a blank block.
- A cell's markdown may be empty; an empty table must be reportable by the block's empty checker.
- A row with no cells, or a table with no rows, renders nothing and must not crash the editor.
- The caption is a single optional string at the top.
- Long cell text wraps; the grid scrolls horizontally rather than shrinking columns below a usable
  width.

## Accessibility

A hand-rolled grid is where accessibility usually fails, so it is an acceptance item rather than a
nicety: `role="grid"`, `role="row"` and `role="gridcell"`; a roving tabindex so the grid is one tab
stop; keyboard-only access to every structural action; a visible focus indicator that survives the
consumer's stylesheet; and header cells exposed as headers rather than cells.

## Scenario oracle

Author a table end to end with no mouse: start a new table, type a header, type a body cell, add a
row with Tab, add a column, mark the second row as a header row, set one cell to centre alignment,
give one cell a bottom edge, remove an empty row, then save and reload. The saved data must contain
the markdown the author typed, the header flags on both header rows, the alignment, and that one
border edge — and must not contain any section value the author did not write. Then remove a row that
holds content and confirm the confirmation appears.

## Work

1. Add the table editor and register it from `ts/src/editor-registrations.ts`; flip the `table`
   `editor` flag in the same change.
2. Declare the new side-effect module in `package.json` `sideEffects`.
3. Carry the caption, and prove the block's empty checker reports an empty grid.
4. Prove structural actions are keyboard reachable and that the grid is a single tab stop.
5. Prove no unmanaged field is rewritten, using a fixture row that already carries a section value.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The declaration and the registration agree | the `table` editor flag is true with nothing registered | the self-registration test passes |
| Data survives the round trip | a header flag, alignment or border is lost on save | the scenario-oracle test asserts each field after reload |
| Unmanaged fields are preserved | a section value is rewritten or dropped | a fixture row carrying a section round-trips byte-identically |
| Nothing is destroyed silently | removing a content-bearing row loses it with no confirmation | the confirmation path is exercised by a test |
| The grid is usable without a mouse | a structural action is reachable only by pointer | a keyboard test performs the oracle's sequence |
| The grid is announced as a grid | cells are plain divs or the grid is many tab stops | roles and roving tabindex are asserted |
| Cell markdown is sanitized | a cell renders raw HTML | the sanitization test covers a cell through the same path the renderer uses |
| The renderer is untouched | the lane restyles the rendered table | the renderer's diff is empty |
| Restyleability holds | the block emits a class or an inline appearance value | contract 003 rules 1–4 |

## Stop conditions

Stop and report if the grid cannot be made keyboard-complete within this lane, if preserving an
unmanaged section value forces a data-shape change, if spans turn out to be required for the oracle to
pass, or if a material interaction decision appears that this brief does not settle. Do not add column
widths, do not author sections, and do not change the renderer.

## Evidence

On completion, record: the editor's controls, the keyboard model, the confirmation behaviour, the
unmanaged-field proof, the component tests, and the exact `effigy qa` result.
