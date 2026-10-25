# Nightfire — current state

`@inflatable-cookie/nightfire@0.5.0` is published on npm and tagged `v0.5.0`;
the Rust crate `nightfire` is tag-only at the same tag. The core vocabulary is
complete: seven block types, each with an editor, a renderer, and a published
payload schema. Renderers load no Poodle at runtime; Poodle is an optional peer
of editor entry points.

`0.5.0` adds the public `./rich-text` entry point: sanitized, schema-scoped
inline node rendering with visible fallbacks, with the registration rules
recorded in [the vocabulary](knowledge/domain/vocabulary.md) and the [README](../README.md).
Consumers own custom nodes and maths dependencies.

Payload schemas are checked against representative stored payloads and against
what each editor actually stores, and the colour-literal guard covers colours
only. Consumers repin from tags, so nothing on `main` reaches them until a
release.

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
