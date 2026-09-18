# g01.014 Download-Card File Titles

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/003-styling-and-restyling.md`
Depends on: g01.008 — the block must exist first
UI classification: refinement — no brief needed, it adds one existing control to an existing row

## Outcome

Each file in a `download_card` carries an optional `title` beside its optional `description`, so an
author can name a download in their own words instead of leaving the library's filename as the only
label.

## Why this is its own lane

The operator refined the block after g01.008 was already dispatched, and a dispatched handoff is a
pinned instruction: g01.008 will deliver `{ media_id, description? }`. Rather than fork the design
across lanes or discard an in-flight worker, this lane adds the field.

It is small, and it is the one media lane that runs in parallel: it touches only the `download_card`
editor and renderer, not `ts/src/core-blocks.ts` or either catalog, so it shares no file with
[g01.012](012-image-block.md).

## Decisions

- **Data.** `files: [{ media_id, title?, description? }]`. Both are author-owned text. `title` is the
  row's own label; `description` is the sentence under it.
- **Rendering.** Row order is title, then the library filename, then the description. A file with no
  title still shows its filename, so the row is never unlabelled.
- **No new capability.** The block already declares a renderer, an editor and an empty checker. This
  lane flips no flag and registers nothing new.
- **Empty.** A file row counts as empty when it has no `media_id`. A title or description without a
  reference stays empty, because there is nothing to download.

## Work

1. Add `title?` to the block's type, the editor's field set and the renderer's row markup.
2. Keep the editor's normalisation honest: it writes `{ media_id, title, description }` per file and
   nothing else, so no stored field is silently dropped.
3. Extend the component tests for a titled row, an untitled row, and a title with no reference.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The field round-trips | a saved title is lost on reload | an editor test writes and rereads a titled row |
| A row is never unlabelled | an untitled file renders an empty row | the renderer falls back to the resolved filename |
| Nothing shared was touched | the lane edits the declaration or a catalog | the diff touches the `download_card` module and its tests only |
| No title without a reference | a row with text and no `media_id` renders as a download | the empty checker reports it empty and the renderer skips it |
| Restyleability holds | a scoped style, a new class, or a new token | contract 003 rules 1–4 |

## Stop conditions

Stop and report if the pinned g01.008 handoff turns out to be wrong about the block shape, if adding
the field requires a declaration or catalog change after all, or if the reviewer's report on g01.008
already contradicts the field.

## Evidence

On completion, record: the field, the row order, the tests, the confirmation that no shared file
changed, and the exact `effigy qa` result.
