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
- File process friction as a Queue papercut with `papercut.add`.

## Repository facts that cost time

- `origin` must be the SCP form `git@github.com:inflatable-cookie/nightfire.git`.
  Queue resolves only `https://github.com/...` or `git@github.com:...`; an
  `ssh://` origin fails every PR-identity check. The `ssh://` form in `README.md`
  is for a consumer's `Cargo.toml`, a different string.
- The Git-consumer proofs install from the pushed commit, so they need a clean,
  pushed head. A dirty or unpushed head fails them by design.
- `release-artifacts/` stays gitignored: untracked certificate output would dirty
  the tree and fail the Git-consumer proof.
- Every local Rust command goes through `ts/scripts/oxide-rust-runner.sh`:
  `run <cargo args>` for a Cargo command, `tool <manifest> -- <command>` for a
  tool that runs Cargo itself, bound to one workspace. Locally that is `oxide`
  or `oxide exec`; `GITHUB_ACTIONS=true` runs Cargo, and
  `EFFIGY_OXIDE_ESCAPE=cargo` is the explicit escape for one invocation. Tom's
  ruling of 2026-10-25, relayed by the Oxide Supervisor, replaces the
  one-use-support deferral and removes per-selector `:cargo` selectors. There is
  no automatic fallback: a missing or refusing Oxide reports its own error and
  that escape. Cargo stays in `.github/` workflows, in intentional Cargo
  product proofs, and in Cargo by hand; `check:git-consumer:cargo` names the
  consumer's language, not an escape.
- Oxide owns the target of every routed command. A proof that builds a
  disposable workspace (the unpacked crate, the Rust Git consumer) prepares it
  as a throwaway Git work tree that ignores `target`, because Oxide refuses a
  workspace whose output it could not ignore. That output lands in Oxide's
  managed storage and outlives the temporary directory: `oxide clean` reclaims
  it, not the proof.
- The export map is a checked contract: `check-exports.ts` compares it against an
  explicit expectation in both directions, so a new subpath is declared there.
- `health` runs the export, boundary, schema, colour-literal, and version-sync
  proofs; `qa` adds sanitization, pack, the Poodle-free renderer consumer,
  Git-consumer proofs, docs, and the release-automation guard.
- The component suite sets Bun's per-test timeout to 30 s because parallel Queue
  workers can saturate the machine; the unit suite keeps Bun's default.

## Cross-repository rule

Nightfire owns package-local implementation. Market owns the release and
consumer-adoption sequence. A Nightfire change does not mutate Underlay, Poodle,
Froyo, Northstar Queue, or an application unless the operator explicitly expands
scope. File friction with those tools as a Queue papercut instead.

## Compatibility rule

Before `1.0`, remove obsolete paths cleanly unless a written consumer contract
requires a migration window. No silent legacy parsing, no speculative shims.

## Release rule

Queue may merge approved work once its review and validation gates pass. No
separate operator merge approval is needed (Tom, 2026-10-24). Task-specific
holds and prerequisites still apply.

Tagging, package publication, consumer notifications and consumer updates need
explicit operator authority. Implementation approval alone does not authorize
them. The release procedure is in [release](release.md).

## Definition of done

A change is done when its scoped behavior is implemented, the relevant Effigy
checks pass, the owning knowledge files match the result, and any remaining gate
is named rather than implied complete.
