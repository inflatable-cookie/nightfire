# g01.001 — Standalone package foundation

- Status: Closed incomplete — repository and TS tranche only
- Completed: 2026-09-04
- External authority: Acowtancy Market Card 272

## Outcome

The retained Nightfire TypeScript/Svelte runtime was extracted from Underlay
into this standalone repository. The work proved that tranche but incorrectly
excluded the generic Rust crate. It is historical bootstrap evidence, not
release acceptance; g01.002 owns the correction.

## Evidence

- GitHub pull request 1 merged the extraction to `main`.
- [Extraction log](../../logs/2026-09-04-card-272-nightfire-repository-extraction.md)
- [Package boundary contract](../../contracts/002-package-boundary.md)
- `effigy qa`
