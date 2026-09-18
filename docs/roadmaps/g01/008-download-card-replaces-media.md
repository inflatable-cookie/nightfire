# g01.008 Download Card Replaces the Media Block

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`, `docs/contracts/003-styling-and-restyling.md`
Depends on: g01.007 — same declaration and catalog files
UI classification: refinement — compact brief below

## Outcome

`media` is retired and `download_card` takes its place: one card listing downloadable files the
consumer holds in a media library, each with an optional description, plus an optional whole-card
description. The media-source registry is the only route from a block to that library.

## Context

The extracted `media` block has an editor and no renderer. Its editor reconstructs block data from a
fixed set, `{ media_id, caption, alt, display }`, so any field removed from that set is silently
dropped the next time an author saves a block. It also predates the vocabulary it now has to fit:
`display` offers inline, block, float-left and thumbnail, which are image presentation, and there is
no download presentation at all.

The registry this lane builds is shared. The `image` block in
g01.012 is its second consumer, alongside the image node inside rich text, so keep it resource-scoped:
extending it there is additive, and forking or renaming it is not.

## Decisions

- **Block data.** `{ description?, files: [{ media_id, description? }] }`. The file's name, size and
  URL are resolved, never stored, so a file renamed in the library updates every card showing it.
- **Registry.** `registerMediaSource({ pick, resolve })` in a Svelte-free module exported as
  `./media-source`:
  - `pick({ multiple }) -> Promise<MediaReference[] | null>` — multi-select is required by this lane.
  - `resolve(reference) -> { url, filename, size?, mime? } | null` — **synchronous**, because a
    renderer resolves too and must work under SSR. The consumer resolves over metadata it has already
    loaded.
- **`MediaKind` moves** into the media-source module and is exported from `./media-source`. It gives a
  row its file icon and lets a picker filter; it is currently only reachable from the retiring
  `./media` subpath.
- **The `./media` subpath is retired** with the block: `ts/src/media.ts`, the Svelte picker context,
  and `MediaEditor.svelte` go together.
- **`media-locator` stays.** It locates a reference anywhere in a block value and is independent of
  the retired block.
- **Inert, never broken.** No registered source, or an unresolved reference, renders the card rows
  inert and marked by a data attribute. It does not throw, and it does not hide the description the
  author wrote.

## UI design brief (compact)

- **Classification and workflow:** refinement. The author picks one or more files from the library,
  then optionally describes the card and each file. No new visual language.
- **Presentation direction:** semantic markup, `data-nightfire-block="download_card"`, data attributes
  for structure, no scoped styles, no class of our own, and no new token. Contract 003 rules 1–4.
- **States:** no source registered → rows inert; registered but unresolved reference → that row inert
  and marked; resolved → filename, size, type, description and a download link. Empty file list →
  nothing rendered.
- **Scenario oracle:** register a source, pick two files, describe the card and one file, save,
  reload, and see both rows rendered with the same references. Then remove the source registration
  and confirm the same block renders inert rather than throwing.

## Work

1. Add the Svelte-free media-source module, export it as `./media-source`, and declare the subpath in
   `package.json` and in the export expectation.
2. Add the `download_card` editor, renderer, and empty checker; register them from the catalog files
   and declare their side-effect modules.
3. Flip the `download_card` capability flags in `ts/src/core-blocks.ts` in the same change.
4. Delete the `media` type, `ts/src/media/`, `ts/src/media.ts`, the `./media` export, its catalog
   import, its `sideEffects` entry, and `ts/tests/nightfire/media-context.test.ts`.
5. Update every test that names `media` as a block type: the self-registration expectation, the
   slash-command tests, and the editor-registry test.
6. Prove the declaration holds, and prove the renderer resolves without any editor module.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The declaration and the registrations agree | `download_card` flags are true with nothing registered | the self-registration test passes and no longer expects `media` |
| One route to the library | the editor or renderer reaches the library another way | `resolve` is the only read path; a test renders with no source registered |
| A renderer resolves | resolution needs Svelte context or an editor import | the renderer graph resolves references and `effigy check:boundaries` passes |
| No silent field loss | a stored field is dropped on save | the editor writes `{ media_id, description }` per file and the card description, and nothing else |
| Retirement is complete | a `media` type, subpath, context or side-effect entry survives | no `media` block registration, no `./media` export, and the export expectation matches both directions |
| Restyleability holds | a scoped style, a new class, or a new token | contract 003 rules 1–4 |

## Stop conditions

Stop and report if `resolve` cannot stay synchronous, if the picker cannot return more than one
reference without a second registration, or if any surviving consumer-visible surface still requires
the `media` type. Do not keep `media` as an alias, and do not add a migration.

## Evidence

On completion, record: the registry shape, the retired paths, the `media` references that had to
change, the component tests, and the exact `effigy qa` result.
