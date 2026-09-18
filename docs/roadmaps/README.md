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
vocabulary. The rich-text block landed; the media family is next. The extracted
`media` type is replaced by `download_card`, which keeps the one media-library
reference, and by `image` and `video`, which are addressed by URL and by embed.
The image and video lanes follow the download card, and the layout editors come
last. They are serial because they share one capability declaration and two
catalog files.

Retiring `media` is a consumer-visible break, and the Acowtancy adoption lane
carries it. Core schema identity is blocked on a cross-repository decision and is
not a local dispatch. The styling question is also open and needs an operator
answer: the `--nightfire-*` set in `ts/src/styles.css` is an application interface
swept in by the extraction rather than a content concern.
[Contract 003](../contracts/003-styling-and-restyling.md) states it, and
[g01.011](g01/011-application-interface-styling.md) tracks the decision and its
blast radius.

## Next Task

Dispatch the download-card lane, which retires `media`, then the image and video
lanes behind it. Keep the layout editors behind their table-editing brief, and do
not execute a release or a consumer cutover.
<!-- northstar:lifecycle:begin schema=northstar.lifecycle.projection.v2 digest=sha256:ac30ee8e536e321d1ed79b80dafb4cbbd9669ebf80764a1dffd52aa3a4f3b0fc -->
| Generation | Disposition | Runway state |
| --- | --- | --- |
| g01 | open | planning_required |
| Task | Status | Stage | Revision | Record digest |
| --- | --- | --- | --- | --- |
| g01.004 | complete | none | 8 | sha256:dba3abc923a3eaee805cad192271f5f72061ce84bd2f2c41019ef42f7d7405e2 |
| g01.005 | complete | none | 8 | sha256:f4a6fc8a8721aac50623d86cd0fcb93e224a18707d82f08e761176e229eeb2ec |
| g01.006 | complete | none | 8 | sha256:95d9283d65afaebaeb875e72da69d1b08d55b2c713cced79bad9666b07f88da6 |
| g01.007 | complete | none | 8 | sha256:882b928392ab0186c8694ff47c06e9f61d7aefab52bea88e9ff5ecd2c1df8bfd |
<!-- northstar:lifecycle:end -->
