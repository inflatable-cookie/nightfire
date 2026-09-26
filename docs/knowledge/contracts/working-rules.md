# Working rules

Nightfire is consumed across repository boundaries. Unrecorded decisions,
ad-hoc commands, or mixed release and adoption work make a small package hard to
verify and unsafe to coordinate.

## Execution

- Start through `docs/README.md`, `effigy tasks`, and `effigy test --plan`.
- Use `effigy doctor` when routing or repository health is uncertain.
- Keep a change bounded to one coherent outcome.
- Preserve unrelated work and avoid speculative infrastructure.
- Update code, knowledge, tests, and indexes together when they form one
  observable change.
- Record process friction in `PAPERCUTS.md`.

## Repository facts that cost time

- `origin` must be the SCP form `git@github.com:inflatable-cookie/nightfire.git`.
  Queue resolves only `https://github.com/...` or `git@github.com:...`; an
  `ssh://` origin fails every PR-identity check. The `ssh://` form in `README.md`
  is for a consumer's `Cargo.toml`, a different string.
- The Git-consumer proofs install from the pushed commit, so they need a clean,
  pushed head. A dirty or unpushed head fails them by design.
- `release-artifacts/` stays gitignored: untracked certificate output would dirty
  the tree and fail the Git-consumer proof.
- The export map is a checked contract: `check-exports.ts` compares it against an
  explicit expectation in both directions, so a new subpath is declared there.
- `health` runs the export, boundary, schema, colour-literal, and version-sync
  proofs; `qa` adds the release-automation guard.

## Cross-repository rule

Nightfire owns package-local implementation. Market owns the release and
consumer-adoption sequence. A Nightfire change does not mutate Underlay, Poodle,
Froyo, Northstar Queue, or an application unless the operator explicitly expands
scope. Record friction with those tools in `PAPERCUTS.md` instead.

## Compatibility rule

Before `1.0`, remove obsolete paths cleanly unless a written consumer contract
requires a migration window. No silent legacy parsing, no speculative shims.

## Release rule

Implementation approval does not authorize merge, tag, package publication, or
consumer updates. Each external mutation needs explicit operator authority. The
release procedure is in [release](release.md).

## Definition of done

A change is done when its scoped behavior is implemented, the relevant Effigy
checks pass, the owning knowledge files match the result, and any remaining gate
is named rather than implied complete.
