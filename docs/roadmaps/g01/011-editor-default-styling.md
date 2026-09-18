# g01.011 Editor Default Styling and Token Provenance

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/contracts/003-styling-and-restyling.md`, `PROVENANCE.md`
Depends on: an operator decision, plus Poodle if the alignment route is chosen
Ready state: blocked — decision on where the token values come from

## Outcome

`ts/src/styles.css` has a declared owner for its values, exactly one declared value per token, and the
editor surfaces keep working defaults.

## What is actually true today

Checked rather than inferred, because an earlier version of this card got it wrong:

- **All 23 tokens are consumed, and only by editor surfaces** — `NightfireEditor`, `NightfireBlockEditor`,
  `SlashCommandPalette`, `editor/NightfireFieldBlockShell`, `editor/NightfireMultiBlockItem`,
  `markup/MarkdownEditorSurface` and `media/MediaEditor`. The heaviest users are `space-2`, `space-3`
  and `space-1`.
- **No renderer references a token.** `TableView`, `ItemListRenderer` and `MarkdownRenderer` emit
  semantic markup and data attributes only, which is what contract 003 requires of them.
- **The subpath is load-bearing.** `README.md` tells editor consumers to import `./styles.css`. A
  consumer that does not falls back to whatever each `var()` declares inline, and several references
  declare nothing.
- **The values came from an application stylesheet.** `PROVENANCE.md` traces them to Underlay's
  `ts/src/styles.css`, so they were copied rather than designed here.
- **Some inline fallbacks contradict the shipped palette.** Fallbacks use a dark surface
  (`15, 23, 42`) and near-white text; the stylesheet defines a light palette (`#fff`, `#111827`).
  Whichever loads, the other is a second undeclared value for the same token.
- **Six names are app-shaped**: `color-surface`, `color-surface-secondary`, `color-danger`,
  `color-field-bg`, `button-chip-padding-block`, `button-chip-padding-inline`.

## Why removal is off the table

An earlier revision of this card, following an earlier revision of contract 003, offered removing
`ts/src/styles.css` and the `./styles.css` subpath. The usage evidence rules that out: it is the
editors' only default appearance, and the scattered dark fallbacks would silently become the look for
any consumer who currently loads the stylesheet. The contract's conclusion is withdrawn and this card
is corrected to match.

## The decision

**Where do the token values come from?**

- **This package owns them.** The names and values here become the authority for its editor chrome,
  the upstream relationship becomes provenance, and app-shaped names are either renamed to editor
  concepts or accepted as the editor's own interface. Cost: nothing to publish first.
- **Align with Poodle's token source.** One theme surface across both packages, with the values defined
  once. Cost: Poodle's tokens are private at `0.0.0` with no exports, so they must be published and
  versioned first, and this becomes a cross-repository dependency.

Whichever is chosen, two things happen in the same change:

1. **Remove the contradicting inline fallbacks**, so each token has exactly one declared value. Where a
   fallback is genuinely wanted as a safe default, it must match the shipped palette rather than
   disagree with it.
2. **Declare the editor default layer in the contract**, so a future reader does not repeat the
   inference that produced the removal question: renderers carry no appearance, and the editor chrome
   ships a default layer whose values have an owner.

## Ready-state rubric

- [ ] Value source decided and recorded.
- [ ] Fallback audit complete: every `var(--nightfire-*)` either has no fallback or one that matches
      the declared value.
- [ ] App-shaped names either renamed or explicitly accepted.
- [ ] Contract 003 states the editor default layer and its owner.
- [ ] If the Poodle route is chosen: its publication is tracked as a cross-repository dependency.

## Next step

Operator decision on the value source. Until it lands, no style change is dispatched, and the queued
editor lanes keep using the existing tokens for their chrome.
