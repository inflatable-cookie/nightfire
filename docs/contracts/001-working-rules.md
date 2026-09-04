# Contract 001 — Working rules

- Status: Active
- Scope: Nightfire repository work
- Owner: Nightfire maintainers

## Problem

Nightfire is consumed across repository boundaries. Unrecorded decisions,
ad-hoc commands, or mixed release and adoption work make a small package hard
to verify and unsafe to coordinate.

## Repository grammar

- Vision states durable direction.
- Architecture states ownership and structure.
- Contracts state observable rules.
- Roadmaps state local sequence and readiness.
- Triage holds unpromoted ideas only.
- Handoffs describe bounded work for another thread.
- Execution logs record what ran and what proved it.

Do not use logs or handoffs as design authority.

## Execution rules

- Start through `docs/README.md`, `effigy tasks`, and `effigy test --plan`.
- Use `effigy doctor` when routing or repository health is uncertain.
- Keep a batch bounded to one coherent outcome.
- Preserve unrelated work and avoid speculative infrastructure.
- Update code, contract, tests, indexes, and evidence together when they form
  one observable change.
- Record process friction in `PAPERCUTS.md`.

## Cross-repository rule

Nightfire owns package-local implementation. Market owns the release and
consumer-adoption sequence. A Nightfire change must not mutate Underlay,
Poodle, Froyo, or an application unless the operator explicitly expands scope.

## Compatibility rule

Before `1.0`, remove obsolete paths cleanly unless a written consumer contract
requires a migration window. Do not add silent legacy parsing or speculative
shims.

## Release rule

Implementation approval does not authorize merge, tag, package publication, or
consumer updates. Each external mutation needs explicit operator authority.

## Definition of done

A batch is done when its scoped behavior is implemented, the relevant Effigy
checks pass, durable docs match the result, and the handoff names any remaining
gate without pretending it is complete.
