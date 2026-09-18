# g01.011 Editor Default Styling and Token Provenance

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/contracts/003-styling-and-restyling.md`, `PROVENANCE.md`
Depends on: an operator decision, plus Poodle if the alignment route is chosen
Ready state: blocked on the value-source decision; the stylesheet question is settled

**The stylesheet stays.** The operator confirmed it on 2026-09-18 after the removal question turned out
to come from the previous Acowtancy chatterbox reading an application stylesheet as this package's
claim to own a theme surface. That reading is withdrawn in contract 003, and no removal is planned.

## Outcome

`ts/src/styles.css` keeps its subpath and its role as the editors' default appearance layer, its values
have a declared owner, and each token has exactly one declared value.

Nothing here is breaking any more, so it carries no release-gate obligation.

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
- **The same concepts exist in Poodle under different names.** Poodle ships 79 `--poodle-*` properties,
  and some describe exactly what Nightfire's describe: `--poodle-color-status-danger` next to
  `--nightfire-color-danger`, and `--poodle-color-border-default` next to
  `--nightfire-color-border-subtle` and `--nightfire-color-border-strong`. The editors embed Poodle
  components (`Button`, `TextInput`, `Select`, `MediaThumbnail`), so a consumer theming an editor sets
  both vocabularies by hand and nothing relates them: change one and the other silently disagrees.

## Why removal was off the table

An earlier revision of this card, following an earlier revision of contract 003, offered removing
`ts/src/styles.css` and the `./styles.css` subpath. The operator confirmed on 2026-09-18 that the
stylesheet stays, and the usage evidence agrees: it is the editors' only default appearance, no renderer
uses a token, and the scattered dark fallbacks would silently become the look for any consumer who
currently loads the stylesheet. Contract 003's removal conclusion is withdrawn and this card is
corrected to match.

The cleanup also covers chrome added by lanes landing in the meantime —
[g01.009](009-table-editor.md)'s grid among them — so no new component copies the contradictory
fallback pattern.

## The decision

**Where do the token values come from?** The stylesheet's role is settled; only its values are open.

- **This package owns them.** The names and values here become the authority for its editor chrome,
  the upstream relationship becomes provenance, and app-shaped names are either renamed to editor
  concepts or accepted as the editor's own interface. Cost: nothing to publish first.
- **Align with Poodle's token source.** One source of values for a surface that is already visually one
  surface, with the overlapping pairs (`danger`, borders, surfaces) related by construction rather than
  by hand. Note this is a **build-time value source, not a shared runtime variable set**: Poodle's
  runtime properties are its own internal surface, so aligning means both stylesheets derive from one
  source. Cost: Poodle's tokens are private at `0.0.0` with no exports, so they must be published and
  versioned first, making this a cross-repository dependency that a release has to wait on.

**Recommendation for this release: own them here.** Nothing has to be published first, it unblocks the
fallback cleanup, and it does not prevent aligning later — it makes alignment a follow-up rather than a
prerequisite. Either way the overlapping pairs get a recorded relationship, so the drift becomes a
decision rather than an accident.

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
