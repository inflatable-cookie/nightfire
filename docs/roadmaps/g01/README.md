# g01 — Standalone package foundation

## Current Generation

Nightfire now contains explicit TypeScript/Svelte and Rust tranches. The Rust
crate is named `nightfire`; both languages consume the root wire fixtures.

## Roadmap Sequence

1. [g01.001 — Standalone package foundation](001-standalone-package-foundation.md) — closed incomplete.
2. [g01.002 — Dual-language repository](002-dual-language-repository.md) — in review.
3. [g01.003 — v0.1.0 release](003-v010-release.md) — gated.
4. Underlay Rust/TS compatibility and direct Froyo/Farmyard adoption — owned by
   the Market roadmap after release.

## Queue

The repository reshape and Rust extraction await independent exact-head review
under Market Card 278. The release remains blocked.

## Dependencies And Parallelism

Underlay compatibility, Froyo adoption, and Farmyard Rust adoption may proceed
in parallel only after an immutable dual-language release exists. Consumer work
must pin that release rather than a mutable branch.

## Historical Language Boundary

The extraction handoff and log use the mistaken TS-only Market Card 272
language. They are retained as execution evidence, not current architecture or
release acceptance.

## Queue lifecycle adoption

- [g01.004 Effigy-hosted lifecycle hook](004-adopt-effigy-hosted-lifecycle-hook.md)
  is an operator-approved, configuration-only maintenance lane. It follows its
  declared Queue dependencies and may run without changing product priority.
  Existing next-task text continues to describe product sequencing; this entry
  authorizes no sibling product work.

- [g01.005 prospective-merge protocol migration](005-prospective-merge-protocol-migration.md)
  owns the operator-authorized v4 manifest update. It is configuration-only,
  independent of product priority, and changes no product behavior.

## Next Task

Review the exact implementation head for [g01.002](002-dual-language-repository.md).
Keep [g01.003](003-v010-release.md) gated.

## Milestones

- [g01.001 — Standalone package foundation](001-standalone-package-foundation.md)
- [g01.002 — Dual-language repository](002-dual-language-repository.md)
- [g01.003 — v0.1.0 release](003-v010-release.md)
<!-- northstar:lifecycle:begin schema=northstar.lifecycle.projection.v2 digest=sha256:89e91a1d2db1e70c5a415e5c612c0ff98e60fb2bbcf8f85203699df41b42b230 -->
| Generation | Disposition | Runway state |
| --- | --- | --- |
| g01 | open | planning_required |
| Task | Status | Stage | Revision | Record digest |
| --- | --- | --- | --- | --- |
| g01.004 | complete | none | 8 | sha256:dba3abc923a3eaee805cad192271f5f72061ce84bd2f2c41019ef42f7d7405e2 |
| g01.005 | complete | none | 8 | sha256:f4a6fc8a8721aac50623d86cd0fcb93e224a18707d82f08e761176e229eeb2ec |
| g01.006 | complete | none | 8 | sha256:95d9283d65afaebaeb875e72da69d1b08d55b2c713cced79bad9666b07f88da6 |
<!-- northstar:lifecycle:end -->
