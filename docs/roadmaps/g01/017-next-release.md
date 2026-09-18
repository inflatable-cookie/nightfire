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
| Styling | g01.011 | value-source decision only; the stylesheet stays |

Anything not accepted by the release commit moves to the following release. The version does not change
to suit it.

## Gates

| Gate | State | Note |
| --- | --- | --- |
| Every scoped lane accepted and merged | in progress | See the table above. |
| Published core schemas — [g01.010](010-core-schema-identity.md) | **ready, release-gated** | The consumer requirement is settled: generic mechanics plus core block payloads, `nightfire.*@1` identifiers, relative `$ref`s, and an executable parity proof. The consumer repins from the tag rather than following it, so this cannot slip. |
| npm trusted publisher names `.github/workflows/release.yml` | **operator-confirmed 2026-09-18** | Outside the repository; no local check can see it. |
| The publish half of `release.yml` has never run | unexercised | `0.1.0` was published by hand. This release is the first OIDC publish. |
| Version set to 0.2.0 in both manifests | not yet | `check:version-sync` enforces npm and the Cargo workspace agreeing. |
| Changelog carries the breaking surface | not yet | A `### Removed` section, or the release has no record of why the minor moved. |
| Full `effigy qa` at the release commit, both languages | not yet | Plus the clean pushed head the Git-consumer proofs need. |

## Work

1. Confirm every scoped lane is accepted, and that nothing half-landed is in the release commit.
2. Set `0.2.0` in `package.json` and the root `Cargo.toml`; run `effigy check:version-sync`.
3. Add the `### Removed` changelog section for the retired media surface.
4. Run `release:npm-admission`, then `release:npm-archive`, then `check:release-candidate` for the
   candidate identity.
5. Run `release.yml` in candidate mode on `main`, then in publish mode.
6. Verify the published artifact by consuming it, including the schemas, rather than by reading the
   workflow log.
7. Record the immutable version, commit, tag and artifact hashes here, and close the release row.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The candidate identity is what gets published | the workflow rebuilds instead of publishing the certified archive | the published tarball hash equals the candidate manifest hash |
| The version is not silently a patch | the tag reads `v0.1.1` | the tag, both manifests and the changelog all read 0.2.0 |
| Published schemas ship | the schemas exist in the repo but not in the tarball | unpack the published tarball and find them |
| A consumer can pin it | the artifact is only reachable from the repository | a disposable consumer resolves the published version |
| The break is documented | a consumer upgrades and cannot find out why | the changelog has a Removed section naming the retired surface |

## Stop conditions

Stop before publishing if the trusted publisher is unset, if the version is not set explicitly, if
`check:release-candidate` does not match the archive that would be published, if `qa` fails at the
release commit, or if any scoped lane is unaccepted. Never publish from an unaccepted `main`, never
re-tag a version, and never re-cut a published version to absorb a late lane.

## Evidence

On completion, record: the version, the release commit, the tag, the artifact hashes, the candidate
manifest identity, the publish result, and the consumer proof.
