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
- File process friction as a Nucleus papercut with `papercut.add`.

## Repository facts that cost time

- `origin` must be the SCP form `git@github.com:inflatable-cookie/nightfire.git`.
  Nucleus resolves only `https://github.com/...` or `git@github.com:...`; an
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
- `ts/tsconfig.json` is the published-source program: strict, with
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noImplicitOverride` and
  `noFallthroughCasesInSwitch`, and no `types` entry, so `ts/src` cannot reach a
  Bun global. `ts/tsconfig.tooling.json` is the scripts-and-tests program and the
  only place `types: ["bun"]` belongs. `ts/scripts/tsconfig.json` and
  `ts/tests/tsconfig.json` extend it, so tooling and tests resolve Bun types
  without leaking them into `ts/src`.
- `check` runs svelte-check with `--fail-on-warnings`; a compiler warning fails
  validation. `check:lint` is `oxlint --type-aware` over the Cloudflare shared
  config. `oxlint.config.ts` enables it and names each override and its reason.
- `check:fmt` is oxfmt over `ts/**` code and the root JSON/TS configs. Docs are
  hand-wrapped prose and the wire fixtures and schemas are the conformance
  boundary, so formatting leaves them alone.
- `check:dead-code` is knip. Its entries are the Effigy-driven proof scripts and
  the tests; `oxfmt` and `svelte-check` are ignored dependencies because Effigy
  invokes them, not source imports.
- `health` runs the export, boundary, schema, colour-literal, and version-sync
  proofs; `qa` adds sanitization, pack, the Poodle-free renderer consumer,
  Git-consumer proofs, docs, and the release-automation guard.
- The component suite sets Bun's per-test timeout to 30 s because parallel Nucleus
  workers can saturate the machine; the unit suite keeps Bun's default.

## Cross-repository rule

Nightfire owns package-local implementation. Market owns the release and
consumer-adoption sequence. A Nightfire change does not mutate Underlay, Poodle,
Froyo, Nucleus, or an application unless the operator explicitly expands
scope. File friction with those tools as a Nucleus papercut instead.

## Compatibility rule

Before `1.0`, remove obsolete paths cleanly unless a written consumer contract
requires a migration window. No silent legacy parsing, no speculative shims.

## Release rule

Nucleus may merge approved work once its review and validation gates pass. No
separate operator merge approval is needed (Tom, 2026-10-24). Task-specific
holds and prerequisites still apply.

Tagging, package publication, consumer notifications and consumer updates need
explicit operator authority. Implementation approval alone does not authorize
them. The release procedure is in [release](release.md).

## Definition of done

A change is done when its scoped behavior is implemented, the relevant Effigy
checks pass, the owning knowledge files match the result, and any remaining gate
is named rather than implied complete.
