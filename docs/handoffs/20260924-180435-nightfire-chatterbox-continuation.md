---
title: Nightfire Chatterbox continuation
kind: northstar-handoff
handoff_mode: chatterbox-continuation
chatterbox_mode: conversational-planning
dispatch_authority: chatterbox
status: active
owner: inflatable-cookie/nightfire
created: 2026-09-24
updated: 2026-09-24
handoff_path: docs/handoffs/20260924-180435-nightfire-chatterbox-continuation.md
tags: [coordination, handoff, chatterbox, continuation, nightfire]
---

# What This Thread Was Doing

This was Nightfire's Chatterbox. It took over from the previous Acowtancy chatterbox's handover
(`docs/handoffs/20260918-123357-nightfire-chatterbox-handover.md`) and worked one long session, dated
2026-09-18 in the commits. The work was four things in sequence:

1. **Restated the generation.** g01's stated aim — a dual-language package and an immutable release — was
   already met, so the aim became completing the declared core vocabulary, publishing the package's own
   schemas, and documenting its styling contract.
2. **Redesigned the media vocabulary with the operator.** The extracted `media` block was three things
   wearing one name; it was retired and replaced by `download_card`, `image` and `video`.
3. **Dispatched and landed thirteen Queue lanes** (g01.007–g01.018), reviewing each closeout and answering
   one escalation.
4. **Released `0.2.0`**, including diagnosing two publish failures and fixing the tooling that caused them.

The conversation also covered a review-capability blocker that produced a new contract, a measured
legibility defect in shipped chrome, and several tool defects. Several operator decisions exist only in
that conversation and are recorded below, because canonical planning cannot recover them.

# Why It Matters

Nightfire is a published package with a consumer chain, so its planning has three coupled surfaces:

- the repository's own docs spine, which is the authority for the vocabulary, the contracts and the
  runway;
- a Queue-orchestrated execution machine whose lanes carry pinned, immutable handoffs;
- a consumer chain — Acowtancy → Underlay → Silo/Farmyard — that pins this package by tag and cannot
  proceed until a tag exists.

The successor inherits a **released package, an empty runway, three open triage notes, and a release path
that has been exercised exactly once**. The bugs that first release exposed are fixed; the machinery is
better than the one that shipped `0.2.0`.

# Current State

Verified on 2026-09-24, not carried from memory.

- **Repository.** `main` is `ffd9886`, clean, equal to `origin/main`. CI green on the last commit.
- **Release.** `@inflatable-cookie/nightfire@0.2.0` is published on npm (`latest`), tagged `v0.2.0`
  (annotated `2dcc5a1c`) at commit `1931cfc2`. The Rust crate is tag-only with no registry publication,
  matching `0.1.0`. The published tarball's sha256 equals the certified candidate manifest's, and the
  artifact was verified by **consuming** it: all eleven schema documents are present, `value.schema.json`
  types `schema` as a string rather than a consumer enum, and `repository.url` resolves.
- **Runway: empty.** Every g01 lane from 004 to 018 is complete; nothing is ready, nothing is queued, and
  no child is active. The generation's derived runway state is `planning_required`, which means it needs a
  planning decision rather than work.
- **Triage holds three notes**, all genuinely open:
  - `20260918-142000-payload-schema-parity.md` — payload schemas are verified against hand-written examples
    in `check-schemas.ts`, not derived from the implementation, so a schema can drift from a block's real
    field set and stay green. This is the sharpest remaining gap, and it is the one the consumer's "shapes
    nothing verifies" objection actually points at.
  - `20260918-163000-literal-families-not-guarded.md` — `check:style-literals` guards colour literals only,
    while its name reads as though it covers all style literals. Radii, spacing and font literals are
    unguarded.
  - `20260918-193000-palette-fix-unpublished.md` — the editor-chrome colour fix is on `main` and in no
    published version. Operator decision: let it ride to the next release.
- **Queue health.** The plugin is healthy and the operator's board works, but **`queue.snapshot` fails from
  the CLI** (`Service socket closed`): the whole-store response measured 14–19 MB and has outgrown the
  CLI's websocket path. Use `queue.detail` per task for state. Recorded in `PAPERCUTS.md` with the
  diagnosis; the fix belongs in `paseo-northstar-queue`.
- **Consumer chain.** Acowtancy has **not** been told `v0.2.0` exists. They repin from the tag, so their
  chain — Nightfire release → Underlay swap → Silo/Farmyard pin — is waiting on that notification. Their
  own follow-up placeholder is
  `docs/roadmaps/g05/141-consume-the-released-nightfire-package.md` section "Follow-on, deliberately not
  bundled" in the Acowtancy repository; there is no Market task number yet.
- **Queue notification route.** This Chatterbox currently owns no unfinished Queue task. The refresh
  preflight returned an empty task set (`planId cace860c654fc8231c5ec1a96f648a36a490b2cb9037e5baeea95176333892f1`),
  so there is nothing to transfer beyond ownership of the lane itself.

# Boundaries

- **Scope.** Nightfire only. Consumer changes, Market sequencing, Underlay and Silo work belong to those
  repositories.
- **Release authority.** Implementation approval does not authorise merge, tag, publication or consumer
  updates. Contract 001 is explicit, and every external mutation needs the operator's explicit go — the
  operator gave it once, for `0.2.0`.
- **Other repositories.** Do not edit `paseo-northstar-queue` or any consumer repo without authority.
  Record friction in `PAPERCUTS.md` instead; that is the established pattern here.
- **Never re-cut a published version.** A tag may be re-cut only while nothing has been published under it,
  and only to avoid burning a version number on a release nobody received. That rule was narrowed from a
  stricter one during `0.2.0` and the reasoning is in the release card.
- **The shared checkout.** The operator and at least one other thread have written into this repository
  mid-session. Expect commits to appear underneath you: stage explicit paths, re-read a file before
  editing it, and never assume `HEAD` is still what you last saw.
- **Pinned handoffs are immutable.** A dispatched Queue task's handoff cannot be amended; only its
  dependencies could be changed, and only before dispatch. The card is the task authority and the handoff
  transports it — which is why card amendments work and handoff edits do not.

# Important Context

## Operator-confirmed decisions that exist only in conversation

- **Vocabulary.** `media` is retired. `download_card` holds media-library references — multiple files, an
  optional `title` and `description` per file, and an optional whole-card `description`. `image` holds one
  library reference (`media_id`) with `alt`, `title`, `caption` and an optional `sizing`. `video` is an
  embed over Poodle's `ParsedEmbed` and uses **no** library. The library hooks apply to `image` and
  `download_card`; the embeds do not.
- **Sizing.** Presets only — `small | medium | large | full`, absent meaning natural. The renderer emits
  the preset as a `data-sizing` attribute and **no style at all**, because contract 003 rule 4 leaves
  appearance entirely to the consumer. Do not add a width.
- **Table.** Direct grid, not a structured field editor. Cell content stays markdown. Per-edge borders are
  required; named row sections are **not** wanted and the editor preserves a section value it does not
  author. No column widths. The package has no undo, so destructive actions confirm in-page. Cell spans
  were split into their own lane for that reason.
- **Review oracle.** Contract 004 declares that this repository's oracle is implementation and interaction
  testing in-repo, that rendered inspection is **not** a review requirement, and that `UI classification`
  means an authoring interaction changed. The operator chose this over adding a runnable demo surface,
  after a UI-classified lane blocked at review because none exists. Contract 004 records what the oracle
  gives up; it is not a claim that rendered review was worthless.
- **Styling.** The stylesheet stays. Its `--nightfire-*` values are the editors' **default** appearance
  layer, and they are overridable defaults: the **names are the public API and the values are not**. The
  six app-shaped names (`color-surface`, `color-surface-secondary`, `color-danger`, `color-field-bg`,
  `button-chip-padding-block`, `button-chip-padding-inline`) are deliberately retained. Aligning with
  Poodle's variables is a documented consumer recipe, not a dependency — Poodle's token package is private
  and unpublished.
- **Release.** `0.2.0`, because the media retirement is breaking and under `0.x` the minor is the breaking
  boundary. The version is set **explicitly**: Effigy computes a patch bump from this history because
  nothing carries a breaking marker.

## Open questions, in the operator's court

1. **Close g01 or open a new generation?** The restated aim is met and released, and the runway is empty.
   Closing g01 and opening a next generation is the cleaner read, but it is an operator decision and has
   not been made.
2. **Whether to notify the Acowtancy consumer** that `v0.2.0` exists. It was offered and not requested. The
   Farmyard/Market-Silo Chatterbox is agent `7dafce52-94a6-4bc9-bba8-ab4bea340027` in the Acowtancy
   checkout; a consultation with it earlier produced the schema requirement now recorded in g01.010.
3. **What the next release is for.** `g01.017` is complete, so the next release needs its own card. The
   unpublished palette fix is one known gate; anything else is a planning decision.

## Gotchas learned the hard way

All of these are in `PAPERCUTS.md` with more detail.

- **`origin` must be the SCP-style URL** (`git@github.com:inflatable-cookie/nightfire.git`). Queue's GitHub
  resolver accepts only `https://github.com/...` or `git@github.com:...`, so an `ssh://` origin fails every
  PR-identity check with "Resolution requires a GitHub origin" and parks a finished lane. The Cargo
  consumer proof normalises both forms, so the SCP form is safe. `README.md`'s `ssh://` example is for a
  *consumer's* `Cargo.toml` and is a different string.
- **A changelog heading with an em dash passes docs QA and breaks `effigy release`.** Use
  `## [0.2.0] - YYYY-MM-DD`.
- **Effigy plans a patch bump for a breaking release.** Set `--version` explicitly.
- **npm provenance requires `package.json` `repository`.** No local gate caught it; the first publish
  failed with `E422`. The papercut suggests asserting it locally.
- **The post-publish verification step was both too impatient and too weak.** It polled for 60 seconds and
  failed a successful release, then never checked the bytes. It now allows five minutes and asserts the
  published tarball's sha256 against the candidate manifest.
- **The lifecycle hook regenerates only its own sentinel block.** Narrative `Next Task` and `Roadmap
  Sequence` prose drifts and must be maintained by hand — it still described g01.008 as in review after
  sixteen further lanes had landed.
- **`check:schemas` asserts exact set equality** between `schemas/blocks/` and `CORE_BLOCK_TYPE_NAMES`, and
  runs in `health`. Declaring a block type without its payload document fails `qa` everywhere; so does
  publishing one early. A type-adding lane must ship its document in the same change.
- **The git-consumer proofs need a clean, pushed head.** They fail on uncommitted work by design, which
  looks like a real failure if you forget.

## Where authority lives

- `docs/architecture/core-package-vocabulary.md` — the vocabulary, the block data shapes, the appearance
  rule, the published-schema requirement, and the open items.
- `docs/contracts/001-working-rules.md` … `004-review-oracle.md` — working rules, package boundary,
  styling and restyling, and the review oracle. All four are indexed; 003 was missing from the index for a
  while after a remove/restore cycle.
- `docs/roadmaps/g01/README.md` — the generation, its sequence, and the Next Task.
- `docs/roadmaps/g01/017-next-release.md` — the release record **and** the exact release sequence, read
  from the workflow. Its stop conditions contain the tag re-cut rule.
- `docs/triage/README.md` — the three open notes.
- `PAPERCUTS.md` — every tool defect this session found.

# Suggested Next Move

**Remain read-only until you receive an explicit `Ownership transfer complete` message.** The source
Chatterbox holds ownership until creation, workspace verification, Queue transfer and that message have
all succeeded. Once it arrives:

1. Read `docs/triage/README.md`, `docs/roadmaps/g01/README.md` and this repository's `AGENTS.md`. Those
   three give you the runway, the gaps and the operating rules faster than anything else.
2. Then ask the operator the one question the runway is actually waiting on: **does g01 close here, or does
   a new generation open, and around what?** Everything else can wait on that answer.
3. Offer, but do not send unprompted, the Acowtancy consumer notification — the tag, the artifact hash and
   the schema-set inventory are what they need to repin.
4. Do not dispatch anything. Nothing is ready, nothing is queued, and no work is authorised.

A useful framing for the first conversation: the session's expensive lessons were all about *claims versus
verification*. A lane's summary said the audit was clean while a literal made text unreadable; a release
said "done" while the registry served a different artifact than the one certified; a papercut said the
board was broken when only the bulk read was. The successor's value is mostly in checking the thing rather
than accepting the description of it.

# Completion Protocol

- **This is a continuation, not a worker handoff.** There is no pull request to open, no independent review
  to wait for, and no lifecycle record to create. It is a transport artifact that stays committed; it is
  **not** a Queue submission, so nothing will consume or delete it.
- It is indexed in `docs/handoffs/README.md` under the entries list, which is correct for a retained
  document. Dispatch handoffs submitted to the Queue must **not** be listed there: the Queue closeout hook
  refuses to delete a handoff that durable Markdown still links to.
- The successor owns operator intake, triage disposition, canonical promotion after explicit operator
  confirmation, and direction to the coordinator. It does not supervise workers, review pull requests, or
  merge.
- Keep the narrative prose current. The lifecycle projection looks after itself; the `Next Task` and
  `Roadmap Sequence` sections do not.
- If triage changes, update `docs/triage/README.md` in the same commit as the note it lists.
