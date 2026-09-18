---
title: g01.014 download-card file titles worker handoff
kind: northstar-handoff
handoff_mode: worker-pr-loop
worker_mode: implementation
dispatch_authority: orchestrator
status: ready-to-launch
owner: inflatable-cookie/nightfire
created: 2026-09-18
updated: 2026-09-18
roadmap: docs/roadmaps/g01/014-download-card-file-titles.md
base_required: pushed-main
queue_dispatch: northstar-queue
queue_approval: "Operator direction on 2026-09-18: 'Can we add an optional title to each file object in download_card?'"
queue:
  capability: mechanical
  notifyOriginOnCloseout: true
  dependsOn: [b9326b78-7750-4574-b6e2-5a3429fcc529]
tags: [coordination, handoff, worker, core-vocabulary, media]
---

## What This Thread Was Doing

The operator refined the `download_card` design after g01.008 was dispatched, so the running lane's
pinned handoff cannot carry the change. This lane adds an optional `title` to each file object, beside
the optional `description`.

It is deliberately small and deliberately separate: it must not disturb the in-flight lane, and it
touches no shared file, so it runs alongside g01.012.

## Why It Matters

Without a title, the library's filename is the only label a row can carry. A title lets an author name
a download in their own words while the filename stays the library's fact and the description stays
the explanation.

## Current State

- **Done:** `download_card` and the media-source registry land in g01.008, which must reach `done`
  before this lane dispatches. Its block data is `{ description?, files: [{ media_id, description? }] }`.
- **Still open:** this field, the image block, and the video embed.
- **Active spec lane:** none. `docs/architecture/core-package-vocabulary.md` is the authority and
  already records the field as decided.
- **Current task:** g01.014 — `docs/roadmaps/g01/014-download-card-file-titles.md`. This handoff
  transports it and does not replace it.
- **Canonical refs:**
  - `docs/architecture/core-package-vocabulary.md` — the block shapes.
  - `docs/contracts/003-styling-and-restyling.md` — the renderer appearance rules.
- **Remaining continuation envelope:** this one field. Do not touch the registry or the image block.
- **Lane budget / pause signal:** one small change; stop rather than widening it.
- **Key files:** the `download_card` module and its tests as g01.008 landed them — read the real paths
  rather than assuming them.

## Boundaries

- **In scope:** `title?` on the per-file object, in the block's type, the editor's field set, the
  renderer's row markup, and the component tests.
- **Out of scope:** the media-source registry, the `image` block, `ts/src/core-blocks.ts`, both
  catalog files, `package.json`, the Rust crate, the wire fixtures, release or version changes, and
  every consumer repository.
- **Repo constraints:** follow `AGENTS.md` and contract 003. The renderer carries no scoped styles, no
  class and no new token. The editor's normalisation must stay honest: it writes
  `{ media_id, title, description }` per file and nothing else, so no stored field is silently
  dropped.
- **No capability change.** The block already declares a renderer, an editor and an empty checker.
  Flip no flag and register nothing.

## Important Context

- **Planning lineage:** the operator asked for the field on 2026-09-18, after g01.008 had been
  dispatched. The architecture document records it, and g01.008's card tells its reviewer not to treat
  the absence as a finding.
- **Row order.** Title, then the library filename, then the description. A file with no title still
  shows its filename, so a row is never unlabelled.
- **Empty means no reference.** A row counts as empty without a `media_id`; text with no reference is
  not a download and must not render as one.
- **Open tensions:** none.

### UI design brief (compact)

- **Classification / current and target workflow:** refinement. The author types a label for a file
  they have already picked. No new interaction pattern and no new visual language.
- **Presentation direction and design authority:** the row markup the download card already emits,
  with the title as its own line. Appearance is the consumer's.
- **States, content ranges, and input envelope:** titled row, untitled row, and a row with text but no
  reference. A long title must not break the row's structure.
- **Selected concept or prototype identity:** none required.
- **Scenario oracle:** pick a file, give it a title and a description, save, reload, and confirm both
  survive and render in that order. Then clear the title and confirm the filename still labels the
  row.
- **Open decisions and stop conditions:** none.

## Suggested Next Move

Read the `download_card` module and its tests as g01.008 left them, add the field, and extend the
existing tests rather than adding a parallel suite. Run `effigy test --plan`, the focused component
suite, `effigy health`, and `effigy qa`. Confirm the diff touches no shared file; if it must, stop and
report, because that would invalidate the parallel dispatch with g01.012.

## Completion Protocol

1. Confirm `docs/roadmaps/g01/014-download-card-file-titles.md` still describes what you built.
2. Confirm the generation runway and log surfaces reflect what actually happened; the Queue closeout
   hook publishes the terminal lifecycle record and the projections.
3. Say plainly whether a successor lane remains in your envelope. It does not.
4. Record the lane budget or pause signal for this stopping point.
5. Call out unresolved risks or blockers plainly.
6. Leave one clear next task for the following thread, which is g01.013's dispatch.

Open one pull request and stop for independent exact-head review. Do not merge, tag, or publish.
