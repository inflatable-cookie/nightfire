---
title: g01.016 item list editor worker handoff
kind: northstar-handoff
handoff_mode: worker-pr-loop
worker_mode: implementation
dispatch_authority: orchestrator
status: ready-to-launch
owner: inflatable-cookie/nightfire
created: 2026-09-18
updated: 2026-09-18
roadmap: docs/roadmaps/g01/016-item-list-editor.md
base_required: pushed-main
queue_dispatch: northstar-queue
queue_approval: "The operator required the whole generation in the next release on 2026-09-18 ('Everything we're working on goes in'), which includes the item-list editor named in the restated g01 aim."
queue:
  capability: general
  notifyOriginOnCloseout: true
  dependsOn: [d3caad3b-ed94-4f9e-a571-aa6295a2d83a]
tags: [coordination, handoff, worker, layout]
---

## What This Thread Was Doing

`item_list` has rendered since the layout family landed and has never been authorable. This lane adds its
editor, and it is the last editor in the generation.

## Why It Matters

It closes the declared vocabulary: after this lane every core block type renders and is editable, which is
the aim the generation was restated around. It is also the cheapest of the editor lanes, because the hard
part already exists — `ts/src/editor/NightfireMultiBlockItem.svelte` hosts a nested block list and the
field-lifecycle helpers update it.

## Current State

- **Done:** everything else. Media, image, table and rich text all have editors; `schemas/` publishes a
  payload document per declared type; the review oracle is declared in contract 004.
- **Still open:** this editor, the table span refinement (in flight), the styling value audit, and the
  release.
- **Active spec lane:** none. `docs/architecture/core-package-vocabulary.md` pins the data shape, and this
  lane does not change it: `{ title?, intro?, variant?, items: [{ title?, body: <blocks> }] }`.
- **Current task:** g01.016 — `docs/roadmaps/g01/016-item-list-editor.md`. This handoff transports it and
  does not replace it.
- **Canonical refs:**
  - `docs/architecture/core-package-vocabulary.md` — the block's data shape.
  - `docs/contracts/003-styling-and-restyling.md` — appearance rules. The renderer is complete.
  - `docs/contracts/004-review-oracle.md` — implementation and interaction oracle, proven in-repo.
- **Remaining continuation envelope:** this editor only. Do not touch the renderer or the payload schema.
- **Lane budget / pause signal:** one bounded editor; stop rather than widening it.
- **Key files:**
  - `/Users/tom/Dev/projects/nightfire/ts/src/layout/ItemListRenderer.svelte` — read it for the exact
    contract; do not change it
  - `/Users/tom/Dev/projects/nightfire/ts/src/editor/NightfireMultiBlockItem.svelte` — the nested block
    body to reuse
  - `/Users/tom/Dev/projects/nightfire/ts/src/editor/field-lifecycle.ts` and `.../value-updates.ts`
  - `/Users/tom/Dev/projects/nightfire/ts/src/core-blocks.ts`,
    `.../editor-registrations.ts`, `package.json` — the flag and the side-effect entry
  - `/Users/tom/Dev/projects/nightfire/ts/tests/components/` — the component tests

## Boundaries

- **In scope:** the `item_list` editor, its registration, the `item_list` `editor` flag, its `sideEffects`
  entry, and its tests.
- **Out of scope:** the renderer, the payload schema, the table editor and spans, the media and video
  lanes, `ts/src/styles.css`, the Rust crate, release changes, and every consumer repository.
- **Shared files.** This lane changes `ts/src/core-blocks.ts` and `ts/src/editor-registrations.ts`, which
  the video lane also changes. It is therefore chained behind g01.013 rather than parallel with it. Do not
  renumber or restructure the declaration; flip one flag.
- **No new data and no new token.** The block's shape is pinned and already published as a schema.

## Important Context

- **Item editing.** Each item is a title field plus the existing nested multi-block body editor. Items are
  added, removed and reordered; removal of an item whose body holds content asks first, in-page rather
  than with a browser dialog, matching the table editor's destructive-action rule.
- **Nested blocks render through the registry**, exactly as the renderer does, so a child type the consumer
  registers becomes authorable inside an item without this lane knowing about it. That reuse is the point
  of the lane — do not build a second nested-block mechanism.
- **Preserve what you do not author.** The renderer reads `intro` and `variant`; the editor exposes the
  title and the items and must round-trip the rest unchanged. The download-card lane hit this same rule and
  the media editor before it was retired illustrates the failure: it rebuilt block data from a fixed field
  set and would have silently dropped anything else.
- **Empty means no items.** An item with no title and no child blocks is empty content; the block's empty
  checker must say so.
- **Open tensions:** none.

### Interaction oracle

Per contract 004, proven in-repo rather than demonstrated:

- Add, remove and reorder by keyboard; a test performs the sequence.
- A child block added inside an item is readable back after a save and reload.
- `variant` and `intro` round-trip unchanged, including when the editor never shows them.
- Removing a content-bearing item triggers the confirmation, and the content survives a refusal.
- The declaration and the registration agree: the self-registration test passes.

## Suggested Next Move

Start here: read `ts/src/layout/ItemListRenderer.svelte` for the data contract, then
`ts/src/editor/NightfireMultiBlockItem.svelte` and the table editor as the most recent example of this
package's editor chrome. Reuse the existing nested-block path rather than inventing one.

Run `effigy test --plan`, the focused component suite, `effigy health`, and `effigy qa`. Note that
`effigy health` includes `check:schemas`, which asserts exact set equality between the published payloads
and the declared block types — you add no type, so it should stay green, but a red result there means the
declaration changed in a way it should not have.

## Completion Protocol

1. Confirm `docs/roadmaps/g01/016-item-list-editor.md` still describes what you built, and that the
   `item_list` `editor` flag matches the registration.
2. Confirm the generation runway and log surfaces reflect what actually happened; the Queue closeout hook
   publishes the terminal lifecycle record and the projections, so do not hand-edit lifecycle state.
3. Say plainly whether a successor lane remains in your envelope. It does not.
4. Record the lane budget or pause signal for this stopping point.
5. Call out unresolved risks or blockers plainly.
6. Leave one clear next task for the following thread, which is g01.011's token audit and then the release.

Open one pull request and stop for independent exact-head review. Do not merge, tag or publish.
