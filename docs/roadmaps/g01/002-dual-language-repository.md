# g01.002 — Dual-language repository

- Status: Ready
- External authority: Acowtancy Market Card 278
- Operator decision: Nightfire owns both language tranches; Rust crate is
  `nightfire`

## Outcome

Reshape Nightfire into explicit `ts/` and `rust/` implementation tranches,
extract the complete generic Rust crate from Underlay, and prove both languages
from one repository without tagging a release.

## Work

- Keep the root npm manifest as the Git-install entry and point exports into
  `ts/src`.
- Add a root Cargo workspace containing crate `nightfire` under `rust/`.
- Move current TypeScript/Svelte source, tests, and config under `ts/`.
- Extract the generic Underlay Rust implementation and tests without
  Underlay-specific adapters or product code.
- Keep root versioned wire fixtures as shared proof.
- Add Rust, TypeScript/Svelte, version-sync, packaging, and clean Git-consumer
  Effigy gates.

## Acceptance

- Both language tranches are explicit and share one version and fixture set.
- Existing npm subpaths and Git install remain valid.
- Cargo Git dependency resolves package `nightfire`.
- Rust public behavior matches the extracted source.
- Complete dual-language QA passes without Underlay or product dependencies.
- No tag or publication occurs.

## Stop condition

Stop on wire/API drift, an Underlay or product dependency, broken npm Git
consumption, split versions/fixtures, or any release mutation.
