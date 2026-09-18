# g01.018 Editor Chrome Literals

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/contracts/003-styling-and-restyling.md`,
`docs/contracts/004-review-oracle.md`,
`docs/architecture/core-package-vocabulary.md`
Depends on: nothing. Every other implementation lane is complete.
UI classification: none — this is a defect repair against an existing surface, not a new experience.
Ready state: ready

## Outcome

Every presentational value in editor chrome resolves through a token, the slash palette is legible in the
shipped default theme, and a check stops the next literal from landing.

## Evidence, measured rather than asserted

`SlashCommandPalette.svelte` paints
`linear-gradient(rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.94))` **over**
`var(--nightfire-color-surface)`, and inherits the light theme's dark text on top of it. Rendered with this
repository's own Svelte compiler and measured in a browser:

| Surface | Text | Visible background | Contrast |
| --- | --- | --- | --- |
| Search input (as shipped) | `#111827` (`--nightfire-color-text`) | `#10182b` | **1.00:1** |
| Command label (as shipped) | `#000000`, inherited | `#141c2e` | **1.23:1** |

WCAG AA needs 4.5:1 for body text. Without the stylesheet it is readable, because the gradient's second
layer is an unresolvable `var()` and the whole declaration drops — so the shipped default is the broken
one.

The component already references `var(--nightfire-color-surface)` *beneath* the dark gradient, so this is
an unfinished migration to tokens rather than a deliberate dark palette. The operator confirmed it reads
as leftover.

## What is actually there

- `SlashCommandPalette.svelte`: three dark values — a gradient, a `box-shadow`, and an input background —
  plus two blues, `rgba(96, 165, 250, 0.32)` and `rgba(59, 130, 246, 0.14)`.
- `editor/NightfireMultiBlockItem.svelte`: three red values — `#f87171`, `rgba(239, 68, 68, 0.15)`,
  `rgba(239, 68, 68, 0.4)`.
- `ts/src/styles.css` is the token **definition** layer, so its literals are correct and out of scope.

## Decisions

- **The palette is light chrome, like everything else.** The dark gradient goes; the surface, border and
  text tokens take over. The root sets `color: var(--nightfire-color-text)` explicitly so command labels
  inherit the token rather than the host page's text colour — that inheritance is half of why it broke.
- **The blues become a selection token.** `#3b82f6` is the focus token's value, so the highlight is the
  same family and belongs in the token set as its own named entity rather than a literal. Add it to
  `ts/src/styles.css` and use it for both the selected item's border and background, at the two alphas the
  component already uses.
- **The reds reuse `--nightfire-color-danger`.** It already exists. Add a tint token only if the tint is
  load-bearing; do not invent a token per shade.
- **Two document counts move in the same change.** `docs/architecture/core-package-vocabulary.md` and
  `docs/contracts/003-styling-and-restyling.md` both state the number of declared `--nightfire-*` values —
  currently 24. Adding a selection token makes it 25, and the last lane was asked to fix this count after
  the fact. Do it in the same commit.
- **No renderer changes.** Renderers reference no token and stay that way.

## Work

1. Replace the dark literals in `SlashCommandPalette.svelte` with the existing surface, border and text
   tokens, and set the root's colour explicitly.
2. Add the selection token to `ts/src/styles.css` and use it for the selected and hovered item.
3. Replace the three red literals in `editor/NightfireMultiBlockItem.svelte` with `--nightfire-color-danger`
   and, only if a tint is genuinely needed, one tint token.
4. Add a check that fails on a colour literal in any `ts/src/**/*.svelte` style block, with a narrow
   exception list for the non-colours (`transparent`, `currentColor`, `inherit`), and wire it into
   `health` beside the export, boundary and schema proofs.
5. Update the two token counts, and record the new token in `PROVENANCE.md` as locally authored — it is
   not derived from the upstream stylesheet, exactly as `--nightfire-color-focus` was not.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The palette is legible in the shipped default | dark text on a dark surface | its style block references the text and surface tokens and contains no colour literal |
| No component style carries a colour literal | a new literal lands in any `.svelte` style block | the new check fails on it, and passes at this head |
| One declared value per token | the selection token is used but not declared | the check and `ts/src/styles.css` agree, and the count in both documents reads 25 |
| The danger state keeps its meaning | the red literals survive or the state loses its colour | the multi-block item references `--nightfire-color-danger` |
| Renderers are untouched | a renderer gains a token | no renderer references a `--nightfire-*` name |
| Nothing else regressed | the component suite or a11y assertions break | the component suite passes untouched |

## Stop conditions

Stop and report if the palette cannot be made legible with existing tokens plus the one selection token, if
the no-literal check cannot be written without an exception list that swallows real colours, or if making
the palette light needs a component-scoped style that the consumer cannot override. Do not redesign the
palette, and do not introduce a second theme inside the editor default layer.

## Evidence

On completion, record: the literals removed, the token added, the check's exception list and result, both
document counts, and the exact `effigy qa` result.
