# g01.017 Next Release

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/roadmaps/g01/003-v010-release.md`,
`docs/contracts/002-package-boundary.md`
Depends on: every lane in this generation
Ready state: planned — version and scope settled by the operator; gated on the lanes

## Outcome

Nightfire **`0.2.0`**: the second immutable release, published from a clean accepted `main`, carrying
the completed core vocabulary and published schemas.

## Version is 0.2.0, and it must be set explicitly

The break is real: `media` is retired, the published `./media` subpath leaves the export map,
`MediaKind` moves to `./media-source`, and the locator re-exports that were reachable through `./media`
move.

Under `0.x` the minor is the breaking boundary — `^0.1.0` does not accept `0.2.0` — so 0.2.0 is exactly
what stops an existing consumer taking the break silently.

**Effigy will not infer it.** `effigy release simulate` proposes `0.1.1`, because neither the commit
history nor the changelog carries a breaking marker. Two consequences:

1. Prepare with an explicit `--version 0.2.0`.
2. Record the break in `CHANGELOG.md` as a `### Removed` section, so the artifact says why the minor
   moved rather than only that it did.

## Scope is everything in this generation

The operator put the whole runway in this release:

| Lane | Task | State |
| --- | --- | --- |
| Media | g01.008 | working |
| Media | g01.012, g01.014 | queued, parallel |
| Media | g01.013 | queued |
| Layout | g01.009 | queued |
| Layout | g01.015, g01.016 | planned, behind g01.009 |
| Schemas | g01.010 | ready; release-gated |
| Styling | g01.011 | ready; naming and fallback cleanup, not a release gate |

Anything not accepted by the release commit moves to the following release. The version does not change
to suit it.

## Gates

| Gate | State | Note |
| --- | --- | --- |
| Every scoped lane accepted and merged | in progress | See the table above. |
| Published core schemas — [g01.010](010-core-schema-identity.md) | **ready, release-gated** | The consumer requirement is settled: generic mechanics plus core block payloads, `nightfire.*@1` identifiers, relative `$ref`s, and an executable parity proof. The consumer repins from the tag rather than following it, so this cannot slip. |
| The published set covers the final declaration | **verify after g01.013** | The completeness check runs on every lane. `g01.013` adds the last block type, so confirm every declared type has a payload document, in the right order — see the triage note on the check's direction. |
| npm trusted publisher names `.github/workflows/release.yml` | **operator-confirmed 2026-09-18** | Outside the repository; no local check can see it. |
| The publish half of `release.yml` has never run | unexercised | `0.1.0` was published by hand. This release is the first OIDC publish. |
| Version set to 0.2.0 in both manifests | not yet | `check:version-sync` enforces npm and the Cargo workspace agreeing. |
| Changelog carries the breaking surface | not yet | A `### Removed` section, or the release has no record of why the minor moved. |
| Full `effigy qa` at the release commit, both languages | not yet | Plus the clean pushed head the Git-consumer proofs need. |
| Review oracle settled for every scoped lane | **done** | [Contract 004](../contracts/004-review-oracle.md) declares the repository's oracle: implementation and interaction tests, no rendered surface. Recorded because a UI-classified lane blocked at review for want of one. |

## Release sequence

Read from `.github/workflows/release.yml`, which separates certification from publication and never
rebuilds on publish. The order matters, and step 2 is the one Effigy gets wrong by default.

1. **Set the version to `0.2.0`** in `package.json` and the root `Cargo.toml`, promote `[Unreleased]` into
   `## [0.2.0] - <date>` keeping the `### Removed` section, commit and push. The head must be clean and
   pushed: `release:npm-admission` refuses a dirty tree, and the Git-consumer proofs install from the
   pushed commit.
2. **Prepare with an explicit version.** `effigy release simulate` computes `0.1.1` from this history
   because nothing carries a breaking marker. Never accept its plan here.
3. **Tag `v0.2.0` on that commit and push the tag.** Publication is an act against a tag, never a branch
   tip, and the verifier checks that the tag's version and commit match the certified set.
4. **Certify.** Dispatch `release.yml` with `mode: candidate` on the tag. It packs once and writes the
   candidate identity manifest binding the source commit and every tarball hash. Record the run ID.
5. **Publish.** Dispatch `release.yml` with `mode: publish` and that `candidate-run-id` (plus `release-tag`
   if dispatched from `main`). It consumes the certified set, verifies tag, commit, version, package set
   and hashes before any npm mutation, and mints the OIDC token for the trusted publisher.
6. **Verify by consuming**, not by reading the log: install the published version and confirm the schemas
   are present in the artifact.
7. **Record and notify.** Version, commit, tag, hashes and the publish result go here; update
   `README.md`'s consumer example to the published tag rather than `v0.1.0`; and tell the Acowtancy
   consumer, which repins from this tag and cannot proceed until it exists.

## Work

1. Confirm every scoped lane is accepted, and that nothing half-landed is in the release commit.
2. Run the release sequence above, steps 1 to 7, taking the operator's explicit authority for steps 3
   to 5.
3. Record the immutable version, commit, tag and artifact hashes here, and close the release row.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The candidate identity is what gets published | the workflow rebuilds instead of publishing the certified archive | the published tarball hash equals the candidate manifest hash |
| The version is not silently a patch | the tag reads `v0.1.1` | the tag, both manifests and the changelog all read 0.2.0 |
| Published schemas ship | the schemas exist in the repo but not in the tarball | unpack the published tarball and find them |
| A consumer can pin it | the artifact is only reachable from the repository | a disposable consumer resolves the published version |
| The break is documented | a consumer upgrades and cannot find out why | the changelog has a Removed section naming the retired surface |
| The schema set is complete at the tag | a declared block type has no payload document | the completeness check passes at the release commit |

## Release record — 0.2.0, published 2026-09-18

| Fact | Value |
| --- | --- |
| Version | `0.2.0` |
| Release commit | `1931cfc2d4d77959140c39ee56047b581b11256d` |
| Tag | `v0.2.0`, annotated `2dcc5a1c`, on that commit |
| Certified candidate run | `35373537030`, success, at the tagged commit |
| Publish run | `35373602459` — publish step succeeded, post-publish verification step failed |
| Published tarball sha256 | `76568ce1b04c9a7a34a2b38244490fa107965a0ef0cb720587b226588bb016fb` |
| Candidate manifest sha256 | identical — the published artifact is the certified one |
| npm registry | versions `0.1.0`, `0.2.0`; `latest` = `0.2.0` |

Verified by **consuming** the published package rather than reading the workflow log: installed
`@inflatable-cookie/nightfire@0.2.0` from the registry into a throwaway project and read the documents
through it. All eleven schema files are present — `value`, `block`, `registry`, `strategy` and seven
payload documents — `value.schema.json` types `schema` as a **string** rather than a consumer enum,
`video.schema.json` requires `embed`, `download_card` admits `media_id`, `title` and `description`, and
`repository.url` is present. The Rust crate is tag-only, with no crate-registry publication, matching
`0.1.0`.

**Two things this release taught, both recorded.**

1. **The first publish failed on missing provenance metadata.** `package.json` had no `repository` field,
   and npm refused with `E422 ... Error verifying sigstore provenance bundle`. Nothing was published by
   that attempt. Fixed at `1931cfc`, and the tag was re-cut to that commit because nothing had been
   published under the first one.
2. **The publish run is red although the release succeeded.** The workflow's post-publish
   "Verify registry availability" step polls the registry twelve times over sixty seconds, and `0.2.0`
   had not propagated inside that window; it reported `unavailable` and exited non-zero. The publish
   itself had already succeeded. A re-run is not possible, because npm refuses to publish over an
   existing version. Recorded in `PAPERCUTS.md`.

## Stop conditions

Stop before publishing if the trusted publisher is unset, if the version is not set explicitly, if
`check:release-candidate` does not match the archive that would be published, if `qa` fails at the
release commit, or if any scoped lane is unaccepted. Never publish from an unaccepted `main`, and never
re-cut a **published** version to absorb a late lane.

A tag may be re-cut **only** while nothing has been published under it, and only to correct a defect that
would otherwise burn a version number on a release nobody ever received. That is what happened here: the
tag moved from `c4e417a` to `1931cfc` before any publication, and its message records the move.

## Evidence

On completion, record: the version, the release commit, the tag, the artifact hashes, the candidate
manifest identity, the publish result, and the consumer proof.
