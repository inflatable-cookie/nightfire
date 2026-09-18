# 003 — Styling and restyling

Status: Active. **Corrected 2026-09-18.** An earlier revision of this contract claimed a theme surface
for this package. The operator corrected it: the token stylesheet is the **desktop application's
interface**, not this package's concern. The rules below replace that revision.

## Rules

1. **Renderers carry no appearance of their own.** No scoped styles, no new CSS classes, and no
   stylesheet that this package owns as its theme surface.
2. A block renderer emits **semantic markup**, a **`data-nightfire-block="<type>"`** hook on its root,
   and data attributes for any structural fact a consumer may need to target.
3. **Content-presentational facts belong to the block's data** — for example which cell edges carry a
   border, and how a cell is aligned — and are emitted as attributes or explicit alignment.
4. **Appearance is entirely the consumer's.** Retained `underlay-*` class selectors are extraction
   artifacts: `PROVENANCE.md` records them as preserving extracted markup and style behaviour and as
   *"not an import, dependency, or integration hook"*. Consumers must not rely on them, and this
   package does not style them.

## The stylesheet that is present today, and why it does not belong here

`ts/src/styles.css` carries `--nightfire-*` values that `PROVENANCE.md` traces to **Underlay's
`ts/src/styles.css`** — an application stylesheet — and **6 of its 23 tokens are UI-shaped**:
`button-chip-padding-block`, `button-chip-padding-inline`, `color-field-bg`, `color-danger`,
`color-surface`, `color-surface-secondary`. A markdown, table or list renderer needs none of them.

So a generic content package currently ships an application interface, including its subpath export
and its `sideEffects` entry for CSS. That is an extraction artifact rather than a design decision.

## Open question

**Where the application interface styling lives**, and whether `ts/src/styles.css` and the
`./styles.css` subpath move out of this package. Removing the subpath touches the export map, which
`check-exports.ts` asserts in both directions, so it is a change with blast radius rather than a file
deletion.
