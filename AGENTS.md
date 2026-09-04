# Agent contract

Nightfire is a standalone generic package. Work only in this repository.

- Start with `docs/README.md`, then inspect `effigy tasks` and
  `effigy test --plan`.
- Keep `core` and `validation` free of framework runtime imports.
- Keep Svelte imports in registry modules type-only.
- Keep renderer-only imports free of editor modules and registration effects.
- Reject unknown block versions and legacy envelopes. Do not invent migration.
- Sanitize every markdown/HTML path before Svelte `{@html}`.
- Keep product schemas, blocks, registrations, Rust, and consumer changes out.
- Add dependencies only with direct retained-source evidence and document the
  reason.
- Run `effigy qa` before handoff. Do not tag, publish, or merge without explicit
  operator approval.
