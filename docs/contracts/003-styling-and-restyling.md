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

`ts/src/styles.css` defines 23 `--nightfire-*` values. **Every one of them is consumed, and only by
editor surfaces** — `NightfireEditor`, `NightfireBlockEditor`, `SlashCommandPalette`, the field shell,
the multi-block item, the markdown surface and the media editor. **No renderer references a token**:
`layout/TableRenderer.svelte`, `layout/ItemListRenderer.svelte` and `markup/MarkdownRenderer.svelte` are
appearance-free, which is what rules 1–4 above require of them.

So the stylesheet is the **editors' default appearance layer**, not a theme surface for rendered
content, and the `./styles.css` subpath is load-bearing. A consumer that follows `README.md` and loads
it gets the shipped light palette; a consumer that does not falls back to whatever each `var()` declares
inline, and several references declare nothing.

**This section previously concluded that the stylesheet does not belong here and named removing it and
its subpath as the open question. The usage evidence above does not support that**, and the conclusion
is withdrawn. Two things about the stylesheet are genuinely wrong, and neither is answered by deleting
it:

1. **The values are copied from an application stylesheet.** `PROVENANCE.md` traces them to Underlay's
   `ts/src/styles.css`, so this package ships values it did not design and does not track.
2. **The inline fallbacks contradict the shipped values.** Several references carry fallbacks that are
   dark — a `15, 23, 42` surface, `#f8fafc` text — while the stylesheet defines a light palette
   (`#fff` surface, `#111827` text). That is a second, undeclared theme scattered through components,
   and it would silently become the appearance the moment the stylesheet stopped loading.

## Open question

Not whether the stylesheet belongs here: it is the editors' default layer and it stays. The question is
**where its values come from** — this package owns them and the upstream relationship becomes
provenance, or they align with Poodle's own token source so both packages share one theme surface. That
second route needs Poodle's tokens published and versioned first.

Either way the contradicting inline fallbacks go, so every token has exactly one declared value, and
the app-shaped names (`color-surface`, `color-danger`, `color-field-bg`, `button-chip-padding-*`) are
either renamed to editor concepts or accepted as the editor's own interface.
