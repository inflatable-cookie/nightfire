# Nightfire

Nightfire is the standalone generic Rust and TypeScript/Svelte block-content
system: one versioned repository, one wire contract, consumed by Acowtancy's
Underlay, Froyo and desktop applications. It must never become an application
framework or a home for product schemas, blocks or UI.

## Where things live

- Docs entry point: `docs/README.md`
- Knowledge (one owner per fact): `docs/knowledge/README.md`
- Open questions: `docs/knowledge/questions.md`

The plan (lanes, their documents and their order), leads, briefs, papercuts,
tasks and status live in Nucleus, never in this repository. Read what's next with
`plan.get` (see the Nucleus skill). The Acowtancy Market roadmap owns
cross-repository release and adoption order; don't copy its cards here.

Commands go through Effigy: `effigy tasks` for the task list, `effigy doctor`
when health or routing is unclear, and `effigy test --plan` before choosing test
scope.

## Papercuts and leads

File small, recurring friction in Nucleus with `papercut.add`, and unplanned
ideas or observations with `lead.add` (see the Nucleus skill). There is no
`PAPERCUTS.md` or `docs/triage/`.

## Guardrails

- Work in this repository only unless the operator expands scope. No consumer,
  Underlay, Poodle or Nucleus changes.
- Nucleus may merge approved work after its review and validation gates pass;
  no separate operator merge approval is needed. See
  `docs/knowledge/contracts/working-rules.md`.
- Do not tag, publish, or notify consumers without explicit operator
  approval. See `docs/knowledge/contracts/release.md`.
- Keep `core` and `validation` free of framework runtime imports; keep Svelte
  imports in registry modules type-only; keep renderer imports free of editor
  modules and registration effects.
- Reject unknown block versions and legacy envelopes. Do not invent migration.
- Sanitize every markdown or HTML path before Svelte `{@html}`.
- Add dependencies only with direct retained-source evidence, recorded in
  `PROVENANCE.md` and the package documentation.
- Keep the Rust crate framework- and Underlay-independent, at edition 2021 and
  MSRV 1.97.1, until an explicit compatibility decision changes them.
- Committed root wire fixtures are the shared Rust/TypeScript conformance
  boundary.
- Before `1.0`, prefer a clean break over a compatibility shim.
- When a change alters what is true, update the owning knowledge file in the
  same PR.
- An operator ruling given in conversation goes into its owning file before
  the thread ends.
- The checkout is shared: stage explicit paths, and expect commits underneath
  you.
- Write in `docs/knowledge/contracts/writing-style.md`: short, blunt, high
  signal.

## Standing quality gate

- Rubric: rate correctness & safety, clarity, structure, error handling,
  tests, idiom & simplicity (add integration when a change crosses seams or
  shared contracts), 1-10 per `hill-climb` anchors: 8 = solid, no bugs or
  structural debt, minor edge cases only; 7 = good with clear gaps.
- Floor (verified at `7297392`): 7.5/10 overall - 8/10 on Rust
  (`rust/nightfire`), TS core/registries/schemas, TS renderers/rich-text,
  tooling/QA/tests, cross-part integration; 7.5/10 on TS editors & shell.
- Workers: rate the parts touched (plus integration if seams or shared
  contracts moved).
- Reviewers: re-check the same scores at the revision under review; send
  back anything that lowers a part or adds a new part below the floor.

## Validate

Before a PR: targeted checks only, run once. That means the tests for the code
you changed (`effigy test:unit`, `effigy test:components` or `effigy test:rust`),
a compile of what you touched (`effigy check:types`, `effigy check`,
`effigy check:lint`, `effigy check:fmt` and `effigy check:dead-code` for
TypeScript/Svelte, `effigy check:rust` for Rust), `effigy health` if you touched
exports, boundaries, schemas or styles, and `effigy qa:docs` if docs changed.
Full `effigy qa` runs on `main` at release points and after a major chunk of
work, run by the planner. Its Git-consumer proofs need a clean, pushed head.

<!-- oxide:begin -->
## Rust commands: use `oxide`

- Write `oxide` wherever you would write `cargo`: `oxide check`, `oxide test`, `oxide run -- <args>`, `oxide add <crate>`.
- Profiles: `quick` (default), `--profile debug` for a debugger, `--release`. Oxide places build output, so it refuses `--target-dir`.
- A tool that runs Cargo itself (Tauri CLI, npm or bun scripts): `oxide exec -- <command>`.
- A `waiting for …` line means another build holds a slot; let it wait. `oxide status` shows the pool, slots and waits.
- Use `oxide clean`, not `cargo clean`.

Managed by `oxide init`; edits between these markers are replaced.
<!-- oxide:end -->
