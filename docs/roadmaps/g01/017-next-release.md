# g01.017 Next Release

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/roadmaps/g01/003-v010-release.md`,
`docs/contracts/002-package-boundary.md`
Depends on: the lanes named under Gates
Ready state: planned — gated; version, timing and content are operator decisions

## Outcome

A second immutable Nightfire release, published from a clean accepted `main`, carrying the completed
core vocabulary and **published schemas**.

## Why this card exists

`0.1.0` was published before the release automation landed, so that release exercised none of it. The
operator has named published schemas as a requirement of the next release, and a requirement needs an
owner and a gate rather than a conversation. This card is that owner.

Version number, timing, and whether the whole generation is in scope are operator decisions and are
not assumed here.

## Gates

| Gate | State | Note |
| --- | --- | --- |
| Published core schemas — [g01.010](010-core-schema-identity.md) | blocked | **Operator requirement.** Scope confirmation is out with the Farmyard chatterbox; the lane is otherwise decision-ready. |
| The publish half of `release.yml` has never run | unexercised | `0.1.0` was published by hand. This release exercises OIDC trusted publishing for the first time. |
| npm trusted publisher names `.github/workflows/release.yml` | unverified, operator-owned | Outside this repository. If it does not, the publish step fails in a way no repository check can catch. |
| Core vocabulary complete to its declaration | in progress | The media family and the table editor are dispatched; whether the operator wants them *in* this release is unconfirmed. |
| Full `effigy qa` at the release commit, both languages | not yet | Plus the clean pushed head the Git-consumer proofs need. |

## Work

1. Confirm version, content and timing with the operator, and record them here.
2. Confirm the npm trusted publisher names `.github/workflows/release.yml` before the first publish attempt.
3. Run `release:npm-admission`, `release:npm-archive`, and `check:release-candidate` for the candidate identity.
4. Run `release.yml` in candidate mode on `main`, then in publish mode.
5. Verify the published artifact by consuming it, not by trusting the workflow log.
6. Record the immutable version, commit and artifact hashes here, and update `CHANGELOG.md`.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The candidate identity matches what is published | the workflow rebuilds instead of publishing the certified archive | the published tarball hash equals the candidate manifest hash |
| Published schemas are in the artifact | the schemas exist in the repo but not in the tarball | unpack the published tarball and find them |
| Version, tag, npm and changelog agree | one of the four lags | `check:version-sync` plus a manual read of the published metadata |
| A consumer can pin it | the artifact is only reachable from the repository | a disposable consumer resolves the published version |
| The Rust side matches | the crate tag and the npm package disagree on version | tag, `Cargo.toml` and `package.json` agree |

## Stop conditions

Stop before publishing if the trusted publisher is unset, if the candidate manifest does not match the
archive that would be published, if `qa` fails at the release commit, or if any gate above is
unresolved. Never publish from an unaccepted `main`, and never re-tag a version.

## Evidence

On completion, record: the version, the release commit, the tag, the artifact hashes, the candidate
manifest identity, the publish result, and the consumer proof.
