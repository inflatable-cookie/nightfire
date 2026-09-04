# g01 — Standalone package foundation

## Current Generation

Nightfire's repository and TypeScript/Svelte tranche exist, but the initial
plan wrongly left the Rust core in Underlay. The operator confirmed that this
repository must own both language tranches and that the Rust crate is named
`nightfire`.

## Roadmap Sequence

1. [g01.001 — Standalone package foundation](001-standalone-package-foundation.md) — closed incomplete.
2. [g01.002 — Dual-language repository](002-dual-language-repository.md) — ready.
3. [g01.003 — v0.1.0 release](003-v010-release.md) — gated.
4. Underlay Rust/TS compatibility and direct Froyo/Farmyard adoption — owned by
   the Market roadmap after release.

## Queue

The repository reshape and Rust extraction are ready under Market Card 278.
The release remains blocked.

## Dependencies And Parallelism

Underlay compatibility, Froyo adoption, and Farmyard Rust adoption may proceed
in parallel only after an immutable dual-language release exists. Consumer work
must pin that release rather than a mutable branch.

## Historical Language Boundary

The extraction handoff and log use the mistaken TS-only Market Card 272
language. They are retained as execution evidence, not current architecture or
release acceptance.

## Next Task

Execute [g01.002](002-dual-language-repository.md). Keep
[g01.003](003-v010-release.md) gated.

## Milestones

- [g01.001 — Standalone package foundation](001-standalone-package-foundation.md)
- [g01.002 — Dual-language repository](002-dual-language-repository.md)
- [g01.003 — v0.1.0 release](003-v010-release.md)
