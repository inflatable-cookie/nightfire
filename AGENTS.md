# Nightfire agent contract

## Scope

Nightfire is the standalone generic TypeScript/Svelte block-content package.
Work in this repository only unless the operator explicitly expands scope.

## Start here

1. Read `docs/README.md`.
2. Run `effigy tasks`.
3. Run `effigy doctor` when repository health or routing is unclear.
4. Run `effigy test --plan` before choosing test scope.

Repository-local architecture and contracts govern Nightfire implementation.
The Acowtancy Market roadmap governs the cross-repository release and adoption
sequence. Do not copy Market delivery cards into this repository.

## Hard rules

- Keep `core` and `validation` free of framework runtime imports.
- Keep Svelte imports in registry modules type-only.
- Keep renderer-only imports free of editor modules and registration effects.
- Reject unknown block versions and legacy envelopes. Do not invent migration.
- Sanitize every markdown or HTML path before Svelte `{@html}`.
- Keep product schemas, product blocks, registrations, Rust, and consumer
  changes out of this repository.
- Add dependencies only with direct retained-source evidence. Record the reason
  in `PROVENANCE.md` and the package documentation.
- Treat committed wire fixtures as the TypeScript conformance boundary. Rust
  wire ownership remains in Underlay.

## Execution

- Use Effigy as the default command surface.
- Make one coherent change at a time. Keep unrelated work out.
- Record lasting decisions in architecture or contracts, not execution logs.
- Put uncertain future work in `docs/triage/`; promote it before execution.
- Record tool or process friction in `PAPERCUTS.md`.
- Prefer deletion or a clean break over compatibility shims before `1.0`.

## Validation and release

Run the narrowest relevant checks first and `effigy qa` before handoff. Do not
tag, publish, merge, or change consumers without explicit operator approval.

## Writing

Use `docs/policy/internal-writing-style.md`: short, blunt, high signal. Update
indexes in the same change as the documents they list.
