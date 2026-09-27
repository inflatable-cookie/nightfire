# Nightfire — current state

`@inflatable-cookie/nightfire@0.2.0` is published on npm and tagged `v0.2.0`;
the Rust crate `nightfire` is tag-only at the same tag. The core vocabulary is
complete: seven block types, each with an editor, a renderer, and a published
payload schema. Renderers load no Poodle at runtime; Poodle is an optional peer
of editor entry points. `main` carries work that no published version has yet.

What matters right now: payload schemas are checked against representative
stored payloads and against what each editor actually stores, and the
colour-literal guard covers colours only. Consumers repin from tags, so nothing
on `main` reaches them until a release.

## By topic

- Vision: [knowledge/vision.md](knowledge/vision.md)
- Architecture: [knowledge/architecture.md](knowledge/architecture.md)
- Contracts: [knowledge/contracts/](knowledge/contracts/README.md)
- Domain: [knowledge/domain/](knowledge/domain/README.md)
- Everything else: [knowledge index](knowledge/README.md)
- Wire fixtures: [fixtures/wire/v1](../fixtures/wire/v1/README.md)
- Dependency provenance: [PROVENANCE.md](../PROVENANCE.md)

## What's next

The project's plan is in Queue: its lanes, their documents and their order.
