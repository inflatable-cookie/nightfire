# Release

How a Nightfire version reaches consumers. The procedure is read from
`.github/workflows/release.yml`, which separates certification from publication
and never rebuilds on publish.

## Rules

- **Set the version explicitly.** Effigy plans the bump from commit and changelog
  markers, and nothing here carries a breaking marker, so `effigy release
  simulate` proposes a patch for a breaking release. Under `0.x` the minor is the
  breaking boundary: `^0.1.0` does not accept `0.2.0`, which is what stops a
  consumer taking a break silently.
- **Record a break in `CHANGELOG.md`** under `### Removed` (or the matching
  section), so the artifact says why the minor moved.
- **Changelog headings use a hyphen:** `## [0.2.0] - YYYY-MM-DD`. An em dash
  passes docs QA and breaks `effigy release`.
- **Never re-cut a published version.** A tag may move only while nothing has
  been published under it, and only to avoid burning a version on a release
  nobody received. The tag message records the move.
- **Publish from a clean, accepted `main`** at a pushed tag. Publication is an
  act against a tag, never a branch tip.
- **Verify by consuming.** Install the published version and read the artifact.
  "On `main`" and "published" are different claims.
- The Rust crate is tag-only. There is no crate-registry publication.
- npm provenance needs `package.json` `repository`; without it the publish fails
  with `E422`.
- The npm trusted publisher names `.github/workflows/release.yml`. That is
  configured outside the repository; no local check sees it.

## Sequence

1. Set the version in `package.json` and the root `Cargo.toml`
   (`check:version-sync` enforces agreement), promote `[Unreleased]` into the
   dated heading, commit, and push. `release:npm-admission` refuses a dirty tree.
2. Run full `effigy qa` at that commit.
3. With operator authority, tag `v<version>` on that commit and push the tag.
4. Certify: dispatch `release.yml` with `mode: candidate` on the tag. It packs
   once and writes the candidate identity manifest binding the source commit and
   every tarball hash. Keep the run ID.
5. Publish: dispatch `release.yml` with `mode: publish` and that
   `candidate-run-id` (plus `release-tag` if dispatched from `main`). It verifies
   tag, commit, version, package set, and hashes before any npm mutation. Its
   post-publish step waits up to five minutes for the registry and asserts the
   published tarball's sha256 against the candidate manifest.
6. Verify by consuming: install from the registry into a throwaway project and
   confirm the schemas and any release-specific change are in the artifact.
7. Update `README.md`'s consumer example to the new tag and tell the Acowtancy
   consumer, which repins from the tag.

## Stop before publishing if

The trusted publisher is unset, the version was not set explicitly,
`check:release-candidate` does not match the archive that would be published,
`qa` fails at the release commit, or any scoped change is unaccepted.
