# g01.015 Table Cell Spans

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/003-styling-and-restyling.md`
Depends on: g01.009 — the grid must exist before it can merge
UI classification: refinement — compact brief below

## Outcome

Merging and splitting cells in the table editor, writing `colspan` and `rowspan`.

## Why this is separate

The renderer already honours `colspan` and `rowspan`, so a hand-written table can use them today. What
is missing is the editor. Merging and splitting is the most complex and most destructive thing a grid
can do — it removes cells — and this package has no editor history. Separating it keeps
[g01.009](009-table-editor.md) shippable on its own and lets spans be designed against a grid that
already works.

## Decisions

- **Merge** a rectangular selection into the top-left cell: that cell takes the selection's row and
  column extent, and the covered cells are removed.
- **Split** restores a cell's extent and inserts empty cells for the ones it covered.
- **Confirmation.** Because there is no undo, merging a selection that holds content asks first, the
  same way removing a content-bearing row does.
- **Keyboard.** Merge and split must be reachable from the keyboard, like every other structural
  action, with selection extendable without a pointer.
- **No raggedness.** A merge or split may not leave a row whose cells do not add up to the table's
  column count. The editor repairs the shape rather than writing a table the renderer must guess at.
- **Data only.** `colspan` and `rowspan` are already the renderer's contract; nothing in the
  declaration, the catalogs or the renderer changes.

## UI design brief (compact)

- **Classification and workflow:** refinement of the g01.009 grid. Select a rectangle, merge it;
  split a merged cell back.
- **Presentation direction:** the same grid and the same Poodle controls. No new visual language.
- **States:** single cell selected → merge unavailable; rectangle selected with content → confirmation;
  merged cell focused → split available; a rectangle that would produce a ragged table → refused.
- **Scenario oracle:** merge a two-by-two block of empty cells, confirm one cell now spans two rows and
  two columns and the row shapes still add up, split it back, and confirm the original cells return.
  Then merge a rectangle containing text and confirm the confirmation appears.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The table stays well formed | a merge leaves rows with fewer cells than columns | a shape test runs after every merge and split |
| Content is not lost silently | a merged rectangle's text disappears with no warning | the confirmation path is tested |
| Spans round-trip | `colspan` or `rowspan` is dropped on save | the reload test asserts both |
| Keyboard parity | spans are pointer-only | a keyboard test performs the oracle |
| Nothing shared changed | the lane edits the declaration, a catalog or the renderer | the diff touches the table editor and its tests only |

## Stop conditions

Stop and report if spans cannot be reconciled with the existing alignment and border controls, if a
well-formed table cannot be guaranteed after a split, or if the grid needs a selection model that
g01.009 did not build.

## Evidence

On completion, record: the merge and split behaviour, the confirmation path, the shape-repair rule,
the component tests, and the exact `effigy qa` result.
