# g01.009 Layout Block Editors

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`, `docs/contracts/003-styling-and-restyling.md`
Depends on: g01.008 — the lanes share the declaration and the two catalog files
UI classification: workflow change — brief not yet written
Ready state: not ready — needs a UI design brief before dispatch

## Outcome

`table` and `item_list` gain editors, closing the renderer-only gap that
`ts/src/core-blocks.ts` currently records.

## Why this card is not ready

Both types render today; neither edits. The two halves are not equally settled:

- **`item_list`** is close to settled. An item is a title plus a body of child
  blocks, and `ts/src/editor/NightfireMultiBlockItem.svelte` plus the
  field-lifecycle pattern already establish how a nested block body is edited.
- **`table`** is not settled. A table editor is a new authoring workflow: cell
  editing, row and column insertion and removal, borders, alignment, and spans.
  Nothing in this repository fixes that experience, so a worker would have to
  invent it. Contract 003 fixes only how the *rendered* result is styled, not how
  it is authored.

## Ready-state rubric

- [ ] Operator-approved table-editing workflow recorded in this card.
- [ ] UI brief written at the classification the lane contains.
- [ ] Decision on whether table cell content stays markdown in the editor.
- [ ] Serial edge to g01.008 recorded in the Queue handoff.

## Next step

Run the UI planning route for the table editing workflow. Until the brief exists,
this card stays planned and no handoff is written.
