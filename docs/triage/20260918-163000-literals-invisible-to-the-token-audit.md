# The token audit is blind to hardcoded literals

Recorded 2026-09-18 from g01.011's independent review. Partly promoted by
g01.018: the colour-literal fix and its guard landed; the sweep for radii,
spacing and font literals is still open.

## What is true

The audit's method is a sweep for `var(--nightfire-*)` references. That finds references, not values. So
it proved what it set out to prove — 24 declared tokens matching 24 referenced tokens, one-to-one, with no
inline fallback left — and still could not see a component that hardcodes a colour instead of naming a
token.

The reviewer found the instance: `ts/src/SlashCommandPalette.svelte` carries literal values including
`linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.94))`, a `box-shadow` in the same
colour, and `#f8fafc` text. Those are the same dark palette that used to live in fallbacks, now written
directly.

## Measured, not asserted

The component was server-rendered with this repository's own Svelte compiler and its compiled CSS, then
measured in a browser. Compositing the declared layers — the palette paints
`linear-gradient(rgba(15,23,42,0.98), rgba(15,23,42,0.94))` *over* `var(--nightfire-color-surface)`:

| Surface | Text colour | Visible background | Contrast |
| --- | --- | --- | --- |
| Search input, as shipped | `#111827` (`--nightfire-color-text`) | `#10182b` | **1.00:1** |
| Command label, as shipped | `#000000` (inherited) | `#141c2e` | **1.23:1** |

WCAG AA needs 4.5:1 for body text. So the palette is not merely off-theme: with the shipped light token
defaults its search field and its command labels are **illegible**. Without the stylesheet it is readable,
because the gradient's second layer is an unresolvable `var()` and the whole declaration drops.

That inverts the earlier framing. The question is not whether hardcoded values are acceptable in editor
chrome; it is that a dark chrome layered over light defaults produces unreadable text, and the component
already references `var(--nightfire-color-surface)` *beneath* the dark gradient — which reads as an
unfinished migration to tokens rather than a deliberate dark palette.

## Why it matters

A literal is worse than a fallback for a consumer. A fallback at least participates in the token cascade —
redeclaring the token changes the result. A literal cannot be reached by any override, so the slash
palette is the one piece of editor chrome a consumer cannot theme without forking.

It is pre-existing extracted chrome rather than something this generation introduced, which is why the
reviewer called it non-blocking and the audit's own acceptance criteria still held.

## The fix, in order

1. Remove the dark literals from `SlashCommandPalette.svelte` so the palette uses the same surface, border
   and text tokens as the rest of the editor chrome. Keep the two blues as a selection token rather than a
   literal; they are the `#3b82f6` family of the focus token.
2. Tokenise the three red literals in `editor/NightfireMultiBlockItem.svelte` against the existing
   `--nightfire-color-danger`, adding a tint token only if the tint is load-bearing.
3. Sweep for literals rather than references — colours, radii, spacing and font values written directly in
   component styles — and correct the audit's own definition, so a future pass does not stop at `var()`: a
   presentational value counts whether it is referenced or written.
4. Prove it in the lane that lands it, with a test that fails on a literal colour in a component style, and
   a contrast assertion for the palette in the shipped default theme.

## Do not

Do not treat the audit as having failed. It proved a precise claim and the reviewer confirmed it. The
lesson is about the claim's shape: "every reference resolves" is not "every value is reachable".
