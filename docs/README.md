# Nightfire documentation

This is the repository documentation front door. Read in this order:

1. [Vision](vision/README.md) — durable product direction.
2. [Architecture](architecture/README.md) — ownership and system boundaries.
3. [Contracts](contracts/README.md) — rules implementation must preserve.
4. [Roadmaps](roadmaps/README.md) — local state and the next authorized move.

## Documentation map

- [Vision](vision/README.md)
- [Architecture](architecture/README.md)
- [Contracts](contracts/README.md)
- [Roadmaps](roadmaps/README.md)
- [Triage](triage/README.md)
- [Handoffs](handoffs/README.md)
- [Execution logs](logs/README.md)
- [Writing policy](policy/internal-writing-style.md)
- [Dependency provenance](../PROVENANCE.md)
- [Wire fixtures](../fixtures/wire/v1/README.md)

## Authority

Nightfire owns its package architecture, contracts, implementation, and proof.
The Acowtancy Market roadmap owns cross-repository sequencing for release,
Underlay compatibility, Froyo adoption, and consumer migration.

This repository uses the baseline Northstar posture. It keeps a complete local
direction and evidence spine without duplicating Market specifications or batch
cards.

## Commands

```sh
effigy tasks
effigy doctor
effigy test --plan
effigy qa
```
