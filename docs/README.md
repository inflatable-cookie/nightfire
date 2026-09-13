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
<!-- northstar:lifecycle:begin schema=northstar.lifecycle.projection.v2 digest=sha256:5b54c561a6ebc9f37e4d1dd1c473f36a19839cee854d4a636b4cc54e05617052 -->
| Generation | Disposition | Runway state |
| --- | --- | --- |
| g01 | open | planning_required |
| Task | Status | Stage | Revision | Record digest |
| --- | --- | --- | --- | --- |
| g01.004 | complete | none | 8 | sha256:dba3abc923a3eaee805cad192271f5f72061ce84bd2f2c41019ef42f7d7405e2 |
<!-- northstar:lifecycle:end -->
