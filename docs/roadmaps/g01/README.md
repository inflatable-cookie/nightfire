# g01 — Standalone package foundation

## Current Generation

g01 stays open. Its aim is no longer extraction — that is done — but the core
package's authority over its own vocabulary:

- one released, dual-language package with one version and one wire fixture set;
- every declared core block type implemented to the extent its declaration
  claims, with the declaration and the catalog held together by a test;
- one media-source registry, serving the image block, the download card, and the
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
7. [g01.007 — Rich-text block](007-rich-text-block.md) — complete.
8. [g01.008 — Download card replaces the media block](008-download-card-replaces-media.md) — complete.
9. [g01.009 — Table editor](009-table-editor.md) — complete.
10. [g01.010 — Publish core schemas](010-core-schema-identity.md) — ready; release-gated, serial behind g01.008.
11. [g01.011 — Editor default styling and token names](011-editor-default-styling.md) — ready; token audit, last of the implementation lanes.
12. [g01.012 — Image block](012-image-block.md) — complete.
13. [g01.013 — Video embed block](013-video-embed-block.md) — in flight.
14. [g01.014 — Download-card file titles](014-download-card-file-titles.md) — complete.
15. [g01.015 — Table cell spans](015-table-cell-spans.md) — ready; parallel with g01.013.
16. [g01.016 — Item list editor](016-item-list-editor.md) — ready; serial behind g01.013.
17. [g01.017 — Next release](017-next-release.md) — planned; gated on the whole generation including published schemas and the untested publish path.

g01.001–003 predate the Queue lifecycle projection, so the generated block below
lists only the tasks the lifecycle system holds records for. Their terminal state
is recorded here and in their own cards.

## Queue

`markdown`, `rich_text` and `download_card` have an editor and a renderer, `table` and `item_list`
render, `media` is retired, and `image` and `video` have no part. The download card presents files
held in a media library; `image`, which will hold a single image from the same library, is still to
add. Both render through one media-source registry. `video` is separate: an embed addressed by
provider and id, with no library involved.

g01.008, g01.009, g01.012 and g01.013 are serial, not parallel: each changes `ts/src/core-blocks.ts` and
the catalog files, and those are adjacent-line edits to one declaration table and two import lists.
Concurrent lanes would meet in the same lines, so each is dispatched behind the one before it through
an explicit Queue dependency. g01.015 and g01.016 sit behind the table editor for the same reason.

g01.014 is the exception. It adds one optional field to the download card's own module and touches no
shared file, so it runs in parallel with g01.012 once g01.008 has landed.

Dispatch order: the download card first, then the image and title lanes together, then published
schemas and the table editor, then the video embed, then the item list and the span refinement. Published
schemas are a [next-release](017-next-release.md) gate: the consumer repins from the tag, so they have to
be in it, and they need a serial edge behind g01.008 because both edit `package.json`.

## Dependencies And Parallelism

Nothing in this generation runs in parallel today. The three implementation lanes
share one declaration and two catalogs; the encoding is one line per part, so the
shared files are small but not divisible.

g01.010 sits outside this repository's dispatch. Acowtancy consumes this package,
and Silo's pin and consumer mirrors carry whatever identifier wins, so its
sequencing belongs to the Acowtancy Market roadmap. Retiring `media` is also a
consumer-visible break that the adoption lane has to carry.

## Historical Language Boundary

The extraction handoff and log use the mistaken TS-only Market Card 272 language.
They are retained as execution evidence, not current architecture or release
acceptance.

## Next Task

g01.008 is complete and in review, with g01.012 and g01.014 queued behind it. Then comes the table
editor, the video embed, and the item list and span refinements. Published schemas (g01.010) are
required in the next release and wait on a scope answer from the Farmyard chatterbox. Do not execute a
release or a consumer cutover.
<!-- northstar:lifecycle:begin schema=northstar.lifecycle.projection.v2 digest=sha256:c520457f1bd75f706693c27bc3f1f50874975998c4f37431e181f3c91fd1ea73 -->
| Generation | Disposition | Runway state |
| --- | --- | --- |
| g01 | open | planning_required |
| Task | Status | Stage | Revision | Record digest |
| --- | --- | --- | --- | --- |
| g01.004 | complete | none | 8 | sha256:dba3abc923a3eaee805cad192271f5f72061ce84bd2f2c41019ef42f7d7405e2 |
| g01.005 | complete | none | 8 | sha256:f4a6fc8a8721aac50623d86cd0fcb93e224a18707d82f08e761176e229eeb2ec |
| g01.006 | complete | none | 8 | sha256:95d9283d65afaebaeb875e72da69d1b08d55b2c713cced79bad9666b07f88da6 |
| g01.007 | complete | none | 8 | sha256:882b928392ab0186c8694ff47c06e9f61d7aefab52bea88e9ff5ecd2c1df8bfd |
| g01.008 | complete | none | 8 | sha256:a885ca6074934bbe9dbca84278a6515b9861b944b68b0e6d3861500de6d817ba |
| g01.009 | complete | none | 8 | sha256:adc2e91246401c3faf1cd60ee9bbc7e47d7d64a03b4c2654b57e6ba8a4b23e64 |
| g01.010 | complete | none | 8 | sha256:6147b9e25bccc07dc6dd493a72169c824b652b9b895dc34a59818661ac42974e |
| g01.012 | complete | none | 8 | sha256:570eb134fcb7ce2de0a50489d17342b906130b230d29a095ea1965b398400b0d |
| g01.013 | complete | none | 8 | sha256:627b5fd51c7f778ba6dab710e43ffbcfe31a63a6dd4a5853d4ff6390de05318f |
| g01.014 | complete | none | 8 | sha256:3405f5b7ace0c4428683d84ba06b6f5dc133e3e08d6e52d5df3d23dce98b9481 |
| g01.015 | complete | none | 8 | sha256:c15629b929f76c9da34ae44e578921c54e0b1ee723c83b362665f94f11187dd8 |
<!-- northstar:lifecycle:end -->
