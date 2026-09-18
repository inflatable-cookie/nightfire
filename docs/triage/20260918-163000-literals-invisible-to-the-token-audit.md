# The token audit is blind to hardcoded literals

Recorded 2026-09-18 from g01.011's independent review. Unpromoted; not execution authority.

## What is true

The audit's method is a sweep for `var(--nightfire-*)` references. That finds references, not values. So
it proved what it set out to prove — 24 declared tokens matching 24 referenced tokens, one-to-one, with no
inline fallback left — and still could not see a component that hardcodes a colour instead of naming a
token.

The reviewer found the instance: `ts/src/SlashCommandPalette.svelte` carries literal values including
`linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.94))`, a `box-shadow` in the same
colour, and `#f8fafc` text. Those are the same dark palette that used to live in fallbacks, now written
directly.

## Why it matters

A literal is worse than a fallback for a consumer. A fallback at least participates in the token cascade —
redeclaring the token changes the result. A literal cannot be reached by any override, so the slash
palette is the one piece of editor chrome a consumer cannot theme without forking.

It is pre-existing extracted chrome rather than something this generation introduced, which is why the
reviewer called it non-blocking and the audit's own acceptance criteria still held.

## The next check, in order

1. Decide whether every presentational value in editor chrome must be token-reachable, or whether hardcoded
   values are accepted for chrome a consumer is not expected to theme. The operator already settled that
   editor chrome ships overridable *defaults*, which points at the first reading.
2. If it must be reachable, sweep for literals rather than references — colours, radii, spacing and font
   values written directly in component styles — and add tokens for the ones that carry meaning. Do not add
   a token per shade of the same surface.
3. Correct the audit's own definition so a future pass does not stop at `var()`: a presentational value
   counts whether it is referenced or written.

## Do not

Do not treat the audit as having failed. It proved a precise claim and the reviewer confirmed it. The
lesson is about the claim's shape: "every reference resolves" is not "every value is reachable".
