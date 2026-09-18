# g01.011 Editor Default Styling and Token Names

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/contracts/003-styling-and-restyling.md`, `PROVENANCE.md`
Depends on: an operator decision on names, plus the fallback cleanup
Ready state: ready — the ownership question dissolved; what remains is naming and cleanup

**The stylesheet stays.** The operator confirmed it on 2026-09-18. The removal question came from the
previous Acowtancy chatterbox reading an application stylesheet as this package's claim to own a theme
surface. That reading is withdrawn in contract 003.

**The value-source question is dissolved.** The operator pointed out what the card had missed: the
tokens are *defaults*, and any consumer can override them — including mapping them onto Poodle's own
values. So "who owns the values" was never the real issue.

## What is actually true today

- **All 23 tokens are consumed, and only by editor surfaces** — `NightfireEditor`, `NightfireBlockEditor`,
  `SlashCommandPalette`, `editor/NightfireFieldBlockShell`, `editor/NightfireMultiBlockItem`,
  `markup/MarkdownEditorSurface` and `media/MediaEditor`. The heaviest users are `space-2`, `space-3`
  and `space-1`.
- **No renderer references a token.** Renderers emit semantic markup and data attributes only, and they
  load Poodle's *components* nowhere: `renderEmbed` from `poodle-core`, which the video lane uses, is a
  pure function with no styles. Poodle components and their styling are editor-side.
- **The subpath is load-bearing.** `README.md` tells editor consumers to import `./styles.css`.
- **The values were copied from an application stylesheet.** `PROVENANCE.md` traces them to Underlay's
  `ts/src/styles.css`.
- **Every token is overridable by cascade.** Contract 003 rule 7 already says a consumer re-declares any
  `--nightfire-*` in the scope that fits. Mapping onto Poodle costs one declaration per token and no
  build step, no fork, no dependency.
- **Six names are app-shaped**: `color-surface`, `color-surface-secondary`, `color-danger`,
  `color-field-bg`, `button-chip-padding-block`, `button-chip-padding-inline`.
- **Some inline fallbacks contradict the shipped palette.** Fallbacks use a dark surface
  (`15, 23, 42`) and near-white text; the stylesheet defines a light palette (`#fff`, `#111827`).

## What remains a real decision

**1. Token names are the public API, and the values are not.**

A consumer's override binds to a *name*. Values can change freely; renaming or removing a name breaks
every consumer mapping, and nothing fails to compile. This is the only thing on this card that is
expensive to change later, and it is cheap now because no consumer has mapped these tokens yet.

So: rename the six app-shaped names to editor concepts, or accept them as this package's interface. The
recommendation is to leave them — `danger`, `surface` and `field-bg` are ordinary editor-chrome concepts
even if the values came from an app, and a rename is a break that buys vocabulary tidiness rather than
capability.

**2. Ship the Poodle mapping, or leave it to consumers.**

The editors embed Poodle components, so their appearance already sits beside Poodle's. Two vocabularies
describe the same concepts — `--poodle-color-status-danger` beside `--nightfire-color-danger`,
`--poodle-color-border-default` beside `--nightfire-color-border-subtle` and `-strong`.

The recommendation is to **document the mapping as a recipe** rather than take a dependency: a handful of
declarations in the consumer's own stylesheet, on a wrapper element, for the pairs that matter.

```css
.nightfire-theme {
  --nightfire-color-danger: var(--poodle-color-status-danger);
  --nightfire-color-border-subtle: var(--poodle-color-border-default);
}
```

That gives every consumer the alignment benefit for the cost of a few lines, keeps Nightfire free of a
cross-repository dependency, and needs no Poodle release. A wrapper element is the robust scope: a
`:root` override depends on stylesheet load order, which is a fragile thing to document.

Depending on Poodle's token package instead would buy the same result and cost a release wait, because
that package is private at `0.0.0` with no exports. If it is published later, the recipe can become an
optional stylesheet without changing any token name.

**3. Fix the contradicting fallbacks.**

Each of those tokens currently has two declared values, and which one applies depends on whether the
stylesheet loaded. It is dead code for a consumer who loads the stylesheet and a silent dark theme for
one who does not. Under a consumer mapping it is worse still: if a consumer maps a token onto a Poodle
variable that is unset, the fallback decides what they get.

One declared value per token: either no fallback, or one that matches the shipped palette.

## Work

1. Decide the naming question, and record the answer in contract 003.
2. Audit every `var(--nightfire-*)` reference and remove or correct its fallback.
3. Add the Poodle mapping recipe to `README.md` if that route is chosen.
4. Confirm contract 003 states the editor default layer, its overridability, and that names are the
   public API.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| One declared value per token | a token resolves to a fallback that disagrees with the stylesheet | a grep proves no `var(--nightfire-*)` fallback differs from its declared value |
| Names are the API | a token is renamed without a recorded break | contract 003 lists the token names as public API and the diff matches it |
| The defaults are overridable | an override needs a fork, a build step or a dependency | the recipe alone changes the rendered editor's appearance |
| Renderers stay out of it | a renderer gains a token dependency | no renderer references a `--nightfire-*` name |

## Stop conditions

Stop and report if the fallback audit finds a token whose declared value and fallback are both
load-bearing for different consumers, or if the mapping recipe cannot express a pair without a value that
Nightfire does not declare.

## Evidence

On completion, record: the naming decision, the fallback audit result, whether the recipe shipped, and
the exact `effigy qa` result.
