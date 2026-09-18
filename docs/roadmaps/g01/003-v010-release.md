# g01.003 — v0.1.0 release

- Status: Complete — released 2026-09-18
- External authority: Acowtancy Market Card 273
- Gates: accepted g01.002 plus explicit operator release confirmation

Terminal record: `@inflatable-cookie/nightfire@0.1.0` is published on npm and the
repository carries the annotated tag `v0.1.0`. The Rust crate is tag-only, with
no crate-registry publication, matching Poodle and Longhorn. This task predates
the Queue lifecycle projection, so it holds no lifecycle record.

Forward gate, not part of this task: `0.1.0` was published before the release
automation landed. `release.yml` candidate mode has run green on `main`, and its
publish half has never run. The first post-`0.1.0` release exercises it, and the
npm trusted publisher must name `.github/workflows/release.yml` before then.
That configuration is operator-owned and lives outside this repository.

## Outcome

Create the first immutable dual-language Nightfire release from an accepted,
clean `main` revision so Rust and TypeScript consumers can pin one stable tag.

## Work

- Confirm the exact accepted commit and clean worktree.
- Run the release gates declared in `effigy.toml` across both languages.
- Confirm Cargo, npm, changelog, and tag versions agree.
- Prove disposable npm and Cargo Git-tag consumers.
- Create and publish only the artifacts explicitly authorized by the operator.
- Record the immutable version and commit for downstream consumers.

## Acceptance

- The release points at the approved dual-language repository state.
- Full Rust and TypeScript/Svelte QA passes at that state.
- Tag, Cargo, npm, and changelog metadata agree.
- Both language consumers can pin the immutable tag without a registry or
  sibling checkout.

## Stop condition

Do not tag or publish from this roadmap entry alone. Stop until g01.002 is
accepted and the operator authorizes the release action and destination.
