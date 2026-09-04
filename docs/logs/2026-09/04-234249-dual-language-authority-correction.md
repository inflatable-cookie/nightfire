# Dual-language authority correction

- Date: 2026-09-04 23:42:49 +0100
- Scope: Nightfire canonical architecture, contracts, and local roadmap
- Operator decision: Nightfire owns Rust and TypeScript/Svelte; standalone Rust
  crate name is `nightfire`

## Correction

The first repository extraction and Northstar normalization incorrectly treated
Nightfire as TypeScript/Svelte only. The promoted Market and Underlay plan had
explicitly excluded the generic Rust crate, so the implementation followed a
bad boundary rather than suffering an isolated copy mistake.

Nightfire is now planned as one versioned repository with:

- root npm Git-install manifest pointing into `ts/`;
- root Cargo workspace exposing crate `nightfire` under `rust/`;
- shared root wire fixtures;
- joint Rust and TypeScript/Svelte Effigy proof.

## State

Current source remains TS-only. Market Card 278 owns the corrective repository
reshape and Rust extraction. The `v0.1.0` release remains blocked until that
card is accepted and the operator separately authorizes release.
