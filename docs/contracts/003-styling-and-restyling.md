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

## The stylesheet that is present today, and what it is for

`ts/src/styles.css` defines 24 `--nightfire-*` values. **Every one of them is consumed, and only by
editor surfaces** — `NightfireEditor`, `NightfireBlockEditor`, `SlashCommandPalette`, the field shell,
the multi-block item, the markdown, media, image, download-card, video, item-list and table editors.
**No renderer references a token**:
`layout/TableRenderer.svelte`, `layout/ItemListRenderer.svelte` and `markup/MarkdownRenderer.svelte` are
appearance-free, which is what rules 1–4 above require of them.

So the stylesheet is the **editors' default appearance layer**, not a theme surface for rendered
content, and the `./styles.css` subpath is load-bearing. A consumer that follows `README.md` and loads
it gets the shipped light palette; a consumer that does not load it gets no Nightfire default appearance
and must provide its own editor styling.

The public token API is the set of names declared in `styles.css`. The table editor's
`--nightfire-table-columns` custom property is per-instance layout state set inline, not a theme token;
the `--nightfire-*` prefix is not by itself a promise that a name is public.

**This section previously concluded that the stylesheet does not belong here and named removing it and
its subpath as the open question. The usage evidence above does not support that, and the conclusion
is withdrawn.** The operator confirmed on 2026-09-18 that the stylesheet stays: the removal question
came from reading an application stylesheet as this package's claim to own a theme surface, which is
not what it is. Two things about the stylesheet are genuinely wrong, and neither is answered by deleting
it:

1. **The values are copied from an application stylesheet.** `PROVENANCE.md` traces them to Underlay's
   `ts/src/styles.css`, so this package ships values it did not design and does not track.
2. **Inline fallbacks contradicted the shipped values.** Several references carried fallbacks that were
   dark — a `15, 23, 42` surface, `#f8fafc` text — while the stylesheet defines a light palette
   (`#fff` surface, `#111827` text). The g01.011 audit removes that second, undeclared theme.

## Settled decisions

Not whether the stylesheet belongs here: it is the editors' default layer, the operator confirmed it
stays, and the `./styles.css` subpath remains public API.

Nor is it where the values come from. That framing was wrong. These are **defaults** and every one is
overridable without a fork, a build step or a dependency, so the values can change freely and the
upstream relationship is provenance.

The token set is **public API by name**. A consumer's override binds to a name,
so renaming or removing one breaks every mapping, and nothing fails to compile
when it happens.

The six app-shaped names are retained as this package's interface:
`color-surface`, `color-surface-secondary`, `color-danger`, `color-field-bg`,
`button-chip-padding-block` and `button-chip-padding-inline`. They are ordinary
editor-chrome concepts, and renaming them would be a breaking change that buys
vocabulary tidiness rather than capability.

The Poodle mapping is a consumer recipe, documented in `README.md`, rather than
a dependency. It can become an optional stylesheet if Poodle publishes its
tokens later without changing any Nightfire token name.

One declared value per token: the editor references no inline fallback, so the
stylesheet value or a consumer override is the only declared theme value.

## Audit result

The g01.011 audit added `--nightfire-color-focus` to the stylesheet and removed
all inline `var(--nightfire-*, fallback)` values from editor chrome. Every
public token reference under `ts/src` now resolves to one declaration in
`styles.css`; renderers remain token-free. The inline table-column property is
the documented per-instance exception and is not part of the public token set.
