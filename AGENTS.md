# Nightfire

Nightfire is the standalone generic Rust and TypeScript/Svelte block-content
system: one versioned repository, one wire contract, consumed by Acowtancy's
Underlay, Froyo and desktop applications. It must never become an application
framework or a home for product schemas, blocks or UI.

## Where things live

- Current state: `docs/README.md`
- Knowledge (one owner per fact): `docs/knowledge/README.md`
- Retired concepts, which must not come back: `docs/knowledge/retired.toml`
- Open questions: `docs/knowledge/questions.md`
- What's next: `docs/plan.md`
- Unresolved leads: `docs/triage/`
- Tool and process friction: `PAPERCUTS.md`

Tasks, briefs and status live in Queue, never in this repository. The Acowtancy
Market roadmap owns cross-repository release and adoption order; don't copy its
cards here.

Commands go through Effigy: `effigy tasks` for the task list, `effigy doctor`
when health or routing is unclear, and `effigy test --plan` before choosing test
scope.

## Guardrails

- Work in this repository only unless the operator expands scope. No consumer,
  Underlay, Poodle or Queue changes.
- Do not tag, publish, merge, or notify consumers without explicit operator
  approval. See `docs/knowledge/contracts/release.md`.
- Keep `core` and `validation` free of framework runtime imports; keep Svelte
  imports in registry modules type-only; keep renderer imports free of editor
  modules and registration effects.
- Reject unknown block versions and legacy envelopes. Do not invent migration.
- Sanitize every markdown or HTML path before Svelte `{@html}`.
- Add dependencies only with direct retained-source evidence, recorded in
  `PROVENANCE.md` and the package documentation.
- Keep the Rust crate framework- and Underlay-independent, at edition 2021 and
  MSRV 1.95, until an explicit compatibility decision changes them.
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

## Validate

`effigy qa` before opening a PR. The Git-consumer proofs need a clean, pushed
head.
