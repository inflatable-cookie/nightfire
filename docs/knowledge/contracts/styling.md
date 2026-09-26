# Styling and restyling

Renderers carry no appearance. Editor chrome ships overridable defaults.

## Rules

1. **Renderers carry no appearance of their own.** No scoped styles, no new CSS
   classes, and no stylesheet that this package owns as a theme surface.
2. A block renderer emits **semantic markup**, a
   **`data-nightfire-block="<type>"`** hook on its root, and data attributes for
   any structural fact a consumer may need to target.
3. **Content-presentational facts belong to the block's data**, for example which
   cell edges carry a border and how a cell is aligned, and are emitted as
   attributes or explicit alignment. Image sizing is a preset emitted as
   `data-sizing` with no style; see [vocabulary](../domain/vocabulary.md#block-data-shapes).
4. **Appearance is entirely the consumer's.** Retained `underlay-*` class
   selectors are extraction artifacts: `PROVENANCE.md` records them as preserving
   extracted markup and style behaviour and as *"not an import, dependency, or
   integration hook"*. Consumers must not rely on them, and this package does not
   style them.

## The editor stylesheet

`ts/src/styles.css` defines 25 `--nightfire-*` values. Every one is consumed,
and only by editor surfaces: `NightfireEditor`, `NightfireBlockEditor`,
`SlashCommandPalette`, the field shell, the multi-block item, and the markdown,
image, download-card, video, item-list and table editors. No renderer references
a token.

So the stylesheet is the **editors' default appearance layer**, not a theme
surface for rendered content. It stays, and the `./styles.css` subpath is public
API. A consumer that loads it gets the shipped light palette; a consumer that
does not must provide its own editor styling.

- **Names are public API; values are not.** Every value is an overridable
  default, so values can change freely. A consumer's override binds to a name,
  so renaming or removing one breaks every mapping and nothing fails to compile.
- **The six app-shaped names stay:** `color-surface`, `color-surface-secondary`,
  `color-danger`, `color-field-bg`, `button-chip-padding-block` and
  `button-chip-padding-inline`. They are ordinary editor-chrome concepts, and
  renaming them is a break that buys vocabulary tidiness, not capability.
- **One declared value per token.** Editor chrome carries no inline
  `var(--nightfire-*, fallback)`; the stylesheet value or a consumer override is
  the only declared theme value. `styles.css` is the only place a colour value is
  declared.
- The table editor's `--nightfire-table-columns` is per-instance layout state
  set inline, not a theme token. The `--nightfire-*` prefix alone is not a
  promise that a name is public.
- Most values are copied from Underlay's application stylesheet; `PROVENANCE.md`
  traces them and records the locally authored ones (`color-focus`,
  `color-selection`). The upstream relationship is provenance, not tracking.
- The Poodle mapping is a consumer recipe in `README.md`, not a dependency.
  Poodle's token package is private and unpublished. It can become an optional
  stylesheet later without changing any Nightfire token name.

## Proof

`ts/scripts/check-style-literals.ts` (`check:style-literals`, in `health`) fails
on a colour literal in any `ts/src/**/*.svelte` style block; the exceptions are
`transparent`, `currentColor` and `inherit`.
`ts/tests/nightfire/style-literals.test.ts` asserts that no renderer references
a token and that the token count here matches `styles.css`.

The guard covers colours only, by decision (operator ruling, 2026-09-26). Radii,
spacing and font literals are not tokenised: each new token name would be public
API, and a stray radius causes inconsistency, not illegibility. The guard's name
and message must say it covers colours, so nobody assumes wider coverage.
