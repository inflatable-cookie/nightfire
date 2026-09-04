# Northstar baseline normalization

- Date: 2026-09-04 23:28:38 +0100
- Scope: repository documentation, Effigy policy, and release readiness surface
- Base: `f1ce02133563e803557f49cfc6e3b935367a405c`

## Outcome

Nightfire now has the baseline Northstar repository spine. The package keeps
local vision, architecture, contracts, roadmap state, triage, handoff, log,
policy, changelog, and agent front doors while Market remains the authority for
cross-repository release and adoption sequencing.

## Decisions

- Use baseline rather than strict Northstar adoption. Nightfire needs local
  direction and proof, not duplicate Market specifications or batch cards.
- Keep the first release gated on explicit operator confirmation.
- Configure native Effigy documentation and release surfaces.
- Preserve the pre-normalization extraction log at its historical path.

## Validation

- `effigy tasks`
- `effigy test --plan`
- `effigy doctor`: 21 checks, no findings
- `effigy qa`: passed
- `effigy release status`: changelog valid; `v0.1.0` identified; release gate
  intentionally not executed

The initial doctor run resolved TypeScript from the parent workspace because
this checkout had no local dependency tree. `effigy bootstrap:deps` restored
the pinned Nightfire dependencies. The tool-level friction is recorded in
`PAPERCUTS.md`.
