# g01 — Standalone package foundation

## Current Generation

g01 stays open. Its aim is no longer extraction — that is done — but the core
package's authority over its own vocabulary:

- one released, dual-language package with one version and one wire fixture set;
- every declared core block type implemented to the extent its declaration
  claims, with the declaration and the catalog held together by a test;
- one media-source seam serving the image block, the media block, and the
  rich-text image node;
- this package's identifiers on its own schemas, generated and published here;
- a decided home for the application-interface styling that the extraction swept
  in.

Release record: `@inflatable-cookie/nightfire@0.1.0` is published on npm and the
repository carries the annotated tag `v0.1.0`. The Rust crate is tag-only, with no
crate-registry publication, matching Poodle and Longhorn. The identity and
styling aims are g01.010 and g01.011; the rest is the runway below.

## Roadmap Sequence

1. [g01.001 — Standalone package foundation](001-standalone-package-foundation.md) — closed incomplete.
2. [g01.002 — Dual-language repository](002-dual-language-repository.md) — complete.
3. [g01.003 — v0.1.0 release](003-v010-release.md) — complete and released.
4. [g01.004 — Adopt the Effigy-hosted lifecycle hook](004-adopt-effigy-hosted-lifecycle-hook.md) — complete.
5. [g01.005 — Prospective-merge protocol migration](005-prospective-merge-protocol-migration.md) — complete.
6. [g01.006 — Adopt published Poodle 0.4.2](006-adopt-published-poodle-0-4-2.md) — complete.
7. [g01.007 — Rich-text block](007-rich-text-block.md) — first lane on the runway.
8. [g01.008 — Media source seam and media shells](008-media-source-seam-and-shells.md) — serial behind g01.007; one vocabulary decision open.
9. [g01.009 — Layout block editors](009-layout-block-editors.md) — planned; needs a table-editing brief.
10. [g01.010 — Core schema identity and publication](010-core-schema-identity.md) — blocked across repositories.
11. [g01.011 — Application interface styling](011-application-interface-styling.md) — blocked on where the interface tokens live.

g01.001–003 predate the Queue lifecycle projection, so the generated block below
lists only the tasks the lifecycle system holds records for. Their terminal state
is recorded here and in their own cards.

## Queue

The declared vocabulary is half implemented. `markdown` has an editor and a
renderer, `table` and `item_list` render, `media` has an editor, and `rich_text`
and `image` have neither part.

g01.007, g01.008, and g01.009 are serial, not parallel: each changes
`ts/src/core-blocks.ts` and the two catalog files, and those are adjacent-line
edits to one declaration table and two import lists. Concurrent lanes would meet
in the same lines, so each is dispatched behind the one before it through an
explicit Queue dependency.

## Dependencies And Parallelism

Nothing in this generation runs in parallel today. The three implementation lanes
share one declaration and two catalogs; the encoding is one line per part, so the
shared files are small but not divisible.

g01.010 sits outside this repository's dispatch. Acowtancy consumes this package,
and Silo's pin and consumer mirrors carry whatever identifier wins, so its
sequencing belongs to the Acowtancy Market roadmap.

## Historical Language Boundary

The extraction handoff and log use the mistaken TS-only Market Card 272 language.
They are retained as execution evidence, not current architecture or release
acceptance.

## Next Task

Dispatch the rich-text lane. The media seam and the layout editors follow in the
sequence above; do not start a later lane from an earlier one, and keep the
layout editors behind their table-editing brief.
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
