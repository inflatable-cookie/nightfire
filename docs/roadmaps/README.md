# Roadmaps

## Rules

- Roadmaps track delivery state; vision and contracts own durable intent.
- This repository records package-local readiness only.
- Acowtancy Market roadmap g04.049 is the authority for release, compatibility,
  and consumer-adoption ordering.
- Do not start a gated item without the named approval or dependency.

## Active generation

- [g01 — Standalone package foundation](g01/README.md) — open; aim restated
  2026-09-18 as completing the declared core vocabulary and owning the package's
  own identity.

See [generation-index.md](generation-index.md) for status.

## Current Queue

`0.1.0` is released: published on npm and tagged `v0.1.0`. The runway is the core
vocabulary. The rich-text block and the download card have landed, and `media` is
retired. The download card presents files held in a media library; `image`, which
will hold a single image from the same library, is still to add. Both render
through one media-source registry. `video` is separate: an embed
addressed by provider and id, with no library involved. The image and video lanes
follow the download card, a small title-field lane runs alongside the image lane,
and the table and item-list editors come last. They are serial because they share
one
capability declaration and two catalog files, except the title lane, which shares
no file.

Retiring `media` is a consumer-visible break, and the Acowtancy adoption lane
carries it. Published schemas are now settled rather than pending: the consumer
requirement arrived from the Market/Silo Chatterbox, and
[g01.010](g01/010-core-schema-identity.md) is ready and release-gated, because the
consumer repins from the tag rather than following it. The styling question turned
out to be a non-question: every `--nightfire-*` token in `ts/src/styles.css` is
consumed by editor chrome and none by a renderer, the stylesheet stays, and the
tokens are overridable defaults, so what remains is token naming and a fallback
cleanup rather than ownership.
[Contract 003](../contracts/003-styling-and-restyling.md) states it, and
[g01.011](g01/011-editor-default-styling.md) tracks it.

## Next Task

The download-card lane is done and in review, having retired `media`. Dispatch the image lane, then
the download-card title lane behind it, then the table editor and the video embed. Do not execute a
release or a consumer cutover.
<!-- northstar:lifecycle:begin schema=northstar.lifecycle.projection.v2 digest=sha256:8f67294d3e301d59b27b5ca3ba621b020e47db4a74c92afefa42dd01ead881bf -->
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
<!-- northstar:lifecycle:end -->
