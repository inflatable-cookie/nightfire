# Nightfire documentation

The entry point to Nightfire's docs. Start with the vision; the knowledge
index names the one file that owns each topic.

- Why Nightfire exists and what it is not: [knowledge/vision.md](knowledge/vision.md)
- Repository shape, ownership and invariants: [knowledge/architecture.md](knowledge/architecture.md)
- Durable rules and interfaces: [knowledge/contracts/](knowledge/contracts/README.md)
- Block vocabulary and published schemas: [knowledge/domain/](knowledge/domain/README.md)
- Everything, by topic: [knowledge/README.md](knowledge/README.md)
- Wire fixtures: [fixtures/wire/v1](../fixtures/wire/v1/README.md)
- Dependency provenance: [PROVENANCE.md](../PROVENANCE.md)

The plan is in Nucleus: its lanes, their documents and their order.

`0.6.0` is published on npm and tagged `v0.6.0`; the Rust crate `nightfire` is
tag-only at the same tag. Consumers repin from tags, so nothing on `main`
reaches them until a release.
