---
title: g01.010 publish core schemas worker handoff
kind: northstar-handoff
handoff_mode: worker-pr-loop
worker_mode: implementation
dispatch_authority: orchestrator
status: ready-to-launch
owner: inflatable-cookie/nightfire
created: 2026-09-18
updated: 2026-09-18
roadmap: docs/roadmaps/g01/010-core-schema-identity.md
base_required: pushed-main
queue_dispatch: northstar-queue
queue_approval: "Operator required published schemas in the next release on 2026-09-18 ('Yes, it needs to be in the next release'), and authorized asking the Farmyard/Market-Silo Chatterbox for the consumer requirement; that reply is recorded in g01.010."
queue:
  capability: complex
  notifyOriginOnCloseout: true
  dependsOn: [b9326b78-7750-4574-b6e2-5a3429fcc529]
tags: [coordination, handoff, worker, schemas, release-gate]
---

## What This Thread Was Doing

Nightfire ships no schemas. The value envelope, block wrapper, registry and strategy mechanics exist as
two implementations and a shared wire fixture, and the JSON Schema documents a consumer needs are
generated on the Acowtancy side under an Acowtancy-local identity.

This lane publishes those documents from this package, under this package's identifiers, with a proof
that they describe the implementation.

## Why It Matters

It is a release gate, not a nicety. The consumer's consultation is explicit: the schemas must exist in
the tagged release because they repin from the tag rather than following it, and their chain after our
tag is Nightfire release → Underlay swap → Silo/Farmyard pin and amalgam rebuild. A release without
schemas does not move that chain.

It also settles who owns the generic shapes. Today a consumer generates documents for shapes its own
generated text calls Nightfire-owned, which is an authority that is not exercising itself.

## Current State

- **Done:** the vocabulary, the media family and the layout editors are in flight. The wire fixture at
  `fixtures/wire/v1/nightfire-values.json` is the shared Rust/TypeScript conformance boundary, and the
  Rust side already validates it.
- **Still open:** these documents, and the styling value-source decision (g01.011).
- **Active spec lane:** none. `docs/architecture/core-package-vocabulary.md` carries the published-schema
  requirement; `docs/roadmaps/g01/010-core-schema-identity.md` carries the consumer's full requirement.
- **Current task:** g01.010 — `docs/roadmaps/g01/010-core-schema-identity.md`. This handoff transports it
  and does not replace it. The card holds the requirement table, the identifier constraints and the
  parity proof.
- **Canonical refs:**
  - `docs/architecture/core-package-vocabulary.md` — published schemas: what ships, what does not, and
    the identifier rules.
  - `docs/contracts/002-package-boundary.md` — public surface and boundary rules.
  - `fixtures/wire/v1/nightfire-values.json` — the shared conformance fixture, including the negative
    cases.
- **Remaining continuation envelope:** these documents and their proof. Do not touch the block payload
  shapes to make a schema easier.
- **Lane budget / pause signal:** no fixed budget; stop at the first stop condition.
- **Key files:**
  - `/Users/tom/Dev/projects/nightfire/package.json` — `files` (not `exports`; see Boundaries)
  - `/Users/tom/Dev/projects/nightfire/ts/scripts/check-pack.ts` — the required-file list
  - `/Users/tom/Dev/projects/nightfire/fixtures/wire/v1/nightfire-values.json`
  - `/Users/tom/Dev/projects/nightfire/ts/src/core-blocks.ts` — `CORE_BLOCK_TYPE_NAMES` drives the
    completeness check
  - `/Users/tom/Dev/projects/nightfire/ts/src/types.ts`, `.../block-versions.ts`, `.../strategies.ts`,
    `.../validation.ts` — the implemented shapes the documents must describe
  - `/Users/tom/Dev/projects/nightfire/rust/nightfire/src/value.rs`, `.../block.rs`, `.../strategy.rs` —
    the same shapes in Rust

## Boundaries

- **In scope:** a new `schemas/` tree; `package.json` `files`; the pack proof's required list; the
  completeness and conformance checks; their wiring into an existing Effigy selector; and the README's
  schema mention.
- **Out of scope:** product strategy schemas, the consumer's generator, question or answer payloads,
  widget vocabulary, spreadsheet core, field profiles, document kinds, publishing enums, media-descriptor
  data, the block payload shapes themselves, the Rust types, the media and table lanes, release or
  version changes, and every consumer repository.
- **Add no dependency.** The documents are hand-authored and verified by executable checks. Do not add a
  schema-generation crate or library; the conformance proof is what the consumer asked for, and a
  dependency needs retained-source evidence this lane does not have.
- **`files`, not `exports`.** The consumer copies files out of the release and resolves relative
  `$ref`s; they do not import schemas at runtime. Add `schemas/` to `files`, and do not add an export
  subpath — that keeps this lane off g01.008's export-map edit and out of the serial chain it would
  otherwise extend.
- **Nothing consumer-shaped may appear.** No `acow:` or `silo.` string, no consumer strategy id, and no
  enum of consumer ids anywhere under `schemas/`. The envelope types the value's `schema` field as a
  string or an open pattern, because that field names the consumer's strategy, not ours.
- **Relative refs only.** Every `$ref` is inside the tree. A network `$ref` fails the consumer's offline
  gate, and so does resolving an `$id`.
- **JSON Schema 2020-12**, stable file names.

## Important Context

- **Planning lineage:** the consumer requirement arrived on 2026-09-18 as an operator-authorized
  consultation with the Market/Silo Chatterbox, measured on the Acowtancy tree after its g05.141. Its
  follow-on placeholder is `docs/roadmaps/g05/141-consume-the-released-nightfire-package.md` section
  "Follow-on, deliberately not bundled", in the Acowtancy repository. Cite that path; there is no task
  number yet, and this lane must not wait for one.
- **The proof is the deliverable's other half.** The consumer named the failure they will not consume:
  publishing shapes that nothing verifies. Four checks, all executable:
  1. **Completeness** — every name in `CORE_BLOCK_TYPE_NAMES` has a payload document, so a new core block
     cannot ship without one.
  2. **Conformance** — every positive case in the shared wire fixture validates against the documents,
     and every negative case is rejected.
  3. **Cross-language agreement** — the fixture is already validated by the Rust implementation, so the
     documents and both implementations agree at the one boundary they share.
  4. **Pack completeness** — the pack proof requires the files, so a release cannot ship without them.
- **The strategies document describes mechanics, not a list.** It must not enumerate consumer strategy
  ids; it describes what a strategy document looks like, and the consumer supplies their own ids and
  their own `schema` const.
- **Two divergences the consumer has to reconcile on their side**, recorded in the card so the ownership
  transfer is explicit: `media` is retired in this release, and `image` is reference-based
  (`{ media_id, alt?, title?, caption?, sizing? }`) rather than URL-based. Do not alter either shape to
  make a document match something they author today.
- **Open tensions:** none for this lane. The `image` field set is a transfer they have accepted in
  principle; whether their authored payload matches is their reconcile, not ours.

### UI design brief

Not applicable. This lane publishes data documents and their proofs; it changes no interface.

## Suggested Next Move

Start here: read `docs/architecture/core-package-vocabulary.md` for the identifier rules and the
publish/do-not-publish split, then `fixtures/wire/v1/nightfire-values.json` and
`ts/tests/wire/conformance.test.ts` to see the boundary the documents must agree with, then
`ts/src/types.ts` and `ts/src/validation.ts` for the implemented shapes.

Author the mechanics documents first — envelope, block, registry, strategy — and prove them against the
fixture before adding the payload documents. Then add the completeness check, wire both into an existing
selector, and extend the pack proof. Run `effigy test --plan`, the focused suites, `effigy health`, and
`effigy qa`. If a shape cannot be described without consumer vocabulary, stop and return that finding
rather than publishing a document that leaks it.

## Completion Protocol

1. Confirm `docs/roadmaps/g01/010-core-schema-identity.md` still describes what you published.
2. Confirm the generation runway and log surfaces reflect what actually happened; the Queue closeout hook
   publishes the terminal lifecycle record and the projections, so do not hand-edit lifecycle state.
3. Say plainly whether a successor lane remains in your envelope. It does not.
4. Record the lane budget or pause signal for this stopping point.
5. Call out unresolved risks plainly, including anything a consumer must reconcile on consume.
6. Leave one clear next task for the following thread, which is the release gate in g01.017.

Open one pull request and stop for independent exact-head review. This lane is a release gate, so the
reviewer must be able to check the parity proof rather than take it on trust. Do not merge, tag, publish,
or cut a release.
