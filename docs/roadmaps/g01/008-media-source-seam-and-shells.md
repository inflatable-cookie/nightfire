# g01.008 Media Source Seam and Media Shells

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`,
`docs/contracts/003-styling-and-restyling.md`
Depends on: g01.007 — the seam is consumed by the rich-text image node, so the
block that consumes it lands first
UI classification: refinement — compact brief below
Ready state: not ready — one vocabulary decision is open, named under Decisions

## Outcome

One media-source seam serves all three consumers, and the `image` and `media`
blocks render.

## Context

The seam exists because the `image` block, the `media` block, and the image node
**inside** `rich_text` all need to turn an opaque reference into something
renderable. Because rich text consumes it, the seam cannot be block-scoped. That
is why it is `registerMediaSource({ pick, resolve })` and not a
`registerBlock*` family member.

The render path needs the read half too: a renderer cannot call a Svelte context
provider, so `resolve` must be reachable from the renderer graph. That means the
seam module is Svelte-free and gets its own subpath rather than living beside
`media/context.ts`.

The existing `media` block already has an editor and reads `media_id`, `caption`,
`alt`, and `display`.

## Decisions

- **Seam shape.** `registerMediaSource({ pick, resolve })`, resource-scoped, in a
  Svelte-free module exported as `./media-source`:
  - `pick(reference?) -> Promise<opaque reference | null>` — creation path, opens
    the consumer's chooser.
  - `resolve(reference) -> renderable source | null` — read path, turns a
    reference into `src` plus presentation metadata.
- **Reference field.** `media_id`, following the existing media block rather than
  inventing a second spelling for the same slot.
- **Two types, not one with a kind.** `image` carries alt text and sizing because
  it is content a reader must interpret and a layout must place. `media` is a
  generalised linkage rendered as a download card.
- **Still open, and the stop condition for this card.** The existing `media`
  editor also reads `alt` and `display`. Either `media` keeps them and `image`
  adds its own, or the clean break moves alt and sizing to `image` only. This is
  a vocabulary decision, not a worker choice.

## UI design brief (compact)

- **Classification and workflow.** Refinement. The author picks a media item and
  sees a reference in the block; the image editor reuses the field and picker
  pattern the `media` editor already established.
- **Presentation direction.** No new visual language. Poodle components; careful
  semantic markup. Renderers carry no scoped styles, emit the data hook, and
  introduce no class of their own. This package adds no token.
- **States.** No source registered → the picker action is unavailable and the
  block renders inert. Registered but unresolved reference → inert, marked by a
  data attribute. Resolved reference → the image or the download card.
- **Scenario oracle.** Register a source, pick an item, save, reload, and see the
  same reference rendered by the renderer with no editor module in the renderer
  graph.

## Work

1. Add the Svelte-free `registerMediaSource` module and export it as
   `./media-source`; declare the subpath in `package.json` and in the export
   expectation.
2. Supply `requestImage` to the `rich_text` editor from the registered source, so
   the image node's insert path works end to end.
3. Add the `image` block editor, renderer, and empty checker; flip its three
   capability flags.
4. Add the `media` renderer as a download card; flip its `renderer` flag.
5. Declare the new side-effect modules in `package.json` `sideEffects` and the
   catalogs.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| One seam, three consumers | the `image` block or rich text invents a second picker path | one registration API, imported by all three consumers |
| The render path needs no editor | resolution requires Svelte context or an editor module | `effigy check:boundaries` passes with the renderers using `resolve` |
| An unregistered consumer still has a valid block | the renderer throws or renders a broken element | a test renders both blocks with no source registered and asserts inert, attribute-marked output |
| Declaration and registration agree | a capability flag is true and nothing is registered | the self-registration test passes |
| Restyleability holds | a scoped style, a new class, or a token dependency | contract 003 rules 1–4 for both renderers: no scoped styles, data hook present, no class or token added |

## Stop conditions

Stop and report if the media-field reconciliation above is still open, if
resolving a reference requires an editor-only import in the renderer graph, or if
the seam needs a second registration family to stay block-scoped.

## Evidence

On completion, record: the seam API, the three consumers, the component tests,
and the exact `effigy qa` result.
