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

Recorded on completion:

- **Literals removed.** `SlashCommandPalette.svelte`: the dark gradient
  `linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.94))` over
  the surface, its `box-shadow` `rgba(15, 23, 42, 0.28)`, the input background
  `rgba(15, 23, 42, 0.82)`, and the selection pair `rgba(96, 165, 250, 0.32)` and
  `rgba(59, 130, 246, 0.14)`. `editor/NightfireMultiBlockItem.svelte`: `#f87171`,
  `rgba(239, 68, 68, 0.15)` and `rgba(239, 68, 68, 0.4)`. Eight literals, two
  files. The palette root now sets `color: var(--nightfire-color-text)` so the
  items' `color: inherit` cannot take the host page's text colour.
- **Token added.** `--nightfire-color-selection: #3b82f6` in `ts/src/styles.css`,
  used for both the selected item's border and its background through
  `color-mix(in srgb, var(--nightfire-color-selection) 32%, transparent)` and
  `... 14% ...`. One token, two alphas. The danger state uses the existing
  `--nightfire-color-danger` the same way at 15% and 40%.
- **The check.** `ts/scripts/check-style-literals.ts` scans every
  `ts/src/**/*.svelte` style block for hex colours, `rgb()`/`hsl()`/`lab()`-family
  functions with literal arguments, and the CSS named colours. Exception list:
  `transparent`, `currentColor`, `inherit`. Wired into `health` as
  `check:style-literals`. Probed with a planted `#ff0000`, `rgb(15 23 42)` and
  `rebeccapurple`: all three reported, exit 1; the shipped head passes with no
  findings. `ts/tests/nightfire/style-literals.test.ts` holds the bite and the
  shipped pass, and asserts no renderer references a token.
- **Both counts.** `docs/architecture/core-package-vocabulary.md` and
  `docs/contracts/003-styling-and-restyling.md` said 24; both read 25, and the
  test fails if either disagrees with `styles.css`. `PROVENANCE.md` records the
  token as locally authored beside `--nightfire-color-focus`.
- **`effigy qa` result.** Passed at the pushed head; the task-by-task output is
  recorded in the pull request body, since the git-consumer proof needs the exact
  committed head and so cannot run against a dirty worktree.
- **Contrast after the fix.** Computed from the declared values, compositing the
  tints over the white surface: `--nightfire-color-text` on
  `--nightfire-color-surface` 17.74:1; `--nightfire-color-text-muted` on it
  4.83:1, so the palette's small `Filter commands` label and its item
  descriptions clear AA; the selected item's 14% selection tint gives
  `--nightfire-color-text` 15.17:1. The danger icon's hover tint gives
  `--nightfire-color-danger` 3.10:1, above the 3:1 WCAG non-text floor. The
  measured 1.00:1 and 1.23:1 layers are gone. jsdom does not composite
  backgrounds, so `ts/tests/nightfire/style-literals.test.ts` asserts only the
  declared text-on-surface pair (17.74:1) and the token references; the tint
  arithmetic above is recorded here, not asserted.
- **Still unseen by the guard.** Radii, spacing and font literals written
  directly in component styles. The triage note keeps that gap open.
