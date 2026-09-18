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
<!-- northstar:lifecycle:begin schema=northstar.lifecycle.projection.v2 digest=sha256:a42985106cd395062f2b83f8aa53b7284a7b0cd95056279080f8b4370b681c67 -->
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
| g01.011 | complete | none | 8 | sha256:5cf73648a75eb87b580460cf56546408c9fde575cd5e4670691f8d484daa8e9b |
| g01.012 | complete | none | 8 | sha256:570eb134fcb7ce2de0a50489d17342b906130b230d29a095ea1965b398400b0d |
| g01.013 | complete | none | 8 | sha256:627b5fd51c7f778ba6dab710e43ffbcfe31a63a6dd4a5853d4ff6390de05318f |
| g01.014 | complete | none | 8 | sha256:3405f5b7ace0c4428683d84ba06b6f5dc133e3e08d6e52d5df3d23dce98b9481 |
| g01.015 | complete | none | 8 | sha256:c15629b929f76c9da34ae44e578921c54e0b1ee723c83b362665f94f11187dd8 |
| g01.016 | complete | none | 8 | sha256:e70dd93fda77ecbc0febb0557ff01d20f458be0fb6f9e070f81963256af9ad86 |
<!-- northstar:lifecycle:end -->
