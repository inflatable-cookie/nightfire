# g01.010 Core Schema Identity and Publication

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`
Depends on: the three decisions below, then a Market/Silo follow-up
Ready state: blocked — the operator requires this in the next release; the scope question is with the
Farmyard chatterbox as of 2026-09-18

## Outcome

This package generates and publishes the schemas for its own value envelope, block, registry and
strategy shapes under its own identifiers, and ships them in the release. A consumer stops hosting
the core's schemas under a local namespace.

## What exists today

- **This package ships no schemas.** The tarball is `ts/src`, `fixtures/wire`, `README.md`, `LICENSE`
  and `PROVENANCE.md`. There is no schema artifact and no generator anywhere in the repository.
- **The types the schemas would describe already exist here**, in both languages: the Rust crate
  carries `SchemaId`, `NightfireValue`, `BlockData`, `BlockVersions`, `NightfireStrategy`,
  `StrategyCardinality` and `MultiConfig`, and the TypeScript side mirrors them.
- **Publishing JSON artifacts from this package is already established.** `fixtures/wire/v1/nightfire-values.json`
  is a *required* file in the pack proof, so a shipped data artifact is proven practice rather than a
  new mechanism.
- **Ownership and location disagree on the consumer side.** Acowtancy generates schema documents from
  an Acowtancy crate into a product mirror, and the mirror's own generated text asserts that the
  generic envelope "stays Nightfire-owned while it resolves inside the digest-locked product mirror".
  So a consumer's artifact tree currently hosts documents that its own text says this package owns.

## The three decisions

**1. Identifier spelling.** The generated documents need `$id`s that are this package's. Today they
carry a consumer-local prefix. Note the distinction that matters: a *value's* `schema` field names the
strategy the consumer declared and stays the consumer's (`acow:content/rich_text`); what moves here is
the identity of the **generic shape** documents. A candidate spelling in the existing convention is
`nightfire.value@1`, `nightfire.block@1`, `nightfire.registry@1`, `nightfire.strategy@1`.

**2. Generation home.** Where the generator lives. The Rust crate is the natural candidate: it already
holds the authoritative types, so one source can feed both languages, and a Rust binary or example can
emit the documents. The alternative is a TypeScript script over the declarations in `ts/src`, which is
easier to run in this repository's existing gates but leaves two type definitions to keep in step.

**3. Publication shape.** What ships and how a consumer reaches it. The candidate: generated documents
under `schemas/`, listed in `package.json` `files`, and reachable through an explicit export subpath so
a consumer can resolve them without guessing a path. A consumer's own generator then `$ref`s the
published envelope instead of copying it.

## My reading of the scope, for confirmation

This package publishes the **generic shapes** — envelope, block, registry, strategy. It does not
publish the consumer's product strategy schemas or take over the consumer's generator; those stay the
consumer's, now referencing published Nightfire documents. If the next release is expected to ship
*published schemas* in some other sense, say so, because it changes the lane's scope rather than its
sequencing.

## Blast radius

- `package.json` — `files` and `exports`. The export edit collides with g01.008's, so this lane needs a
  serial edge behind it.
- `ts/scripts/check-pack.ts` — add the schema artifacts to the required list so a pack cannot ship
  without them.
- A freshness gate in `qa`, so generated schemas cannot silently drift from the declaration. This is
  the same shape as the existing version-sync check.
- `README.md` — the consumer section gains the schema subpath.
- Market/Silo — their pins, mirrors and generated-types pipeline carry whatever identifier wins, so
  their follow-up is not optional.
- Not affected: the release automation. The candidate manifest pins tarball names and hashes per
  package, and `check-pack` asserts a required subset rather than an exhaustive list.

## Ready-state rubric

- [ ] Identifier spelling recorded exactly.
- [ ] Generation home named, with the retained evidence for it.
- [ ] Publication shape decided, including the export subpath.
- [ ] Scope reading above confirmed or corrected.
- [ ] Freshness gate named.
- [ ] Market/Silo follow-up recorded before any local work starts.

## Next step

Operator decision on the three items, plus the Farmyard chatterbox's answer on scope. Cross-repository
sequencing stays with the Market roadmap, and the consumer mirrors have to follow the chosen identifier
whatever it is.

This lane is a **[next-release](017-next-release.md) gate**, so it has to be accepted before that
release rather than after it. Sequencing locally: it edits `package.json` `exports`, which g01.008 also
edits, so it needs a serial edge behind that lane; it touches neither the declaration nor the catalogs,
so it runs in parallel with the media and table lanes otherwise.
