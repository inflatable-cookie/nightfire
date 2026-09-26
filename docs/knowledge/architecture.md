# Architecture

## Repository shape

Nightfire is one versioned repository with two implementation tranches:

```text
package.json        npm Git-install entry for @inflatable-cookie/nightfire
Cargo.toml          Cargo workspace and shared Rust release metadata
ts/                 TypeScript/Svelte source, tests, and config
rust/               Rust crate `nightfire` and tests
fixtures/wire/      shared versioned cross-language contract
schemas/            published JSON Schema documents
```

The root npm manifest is deliberate: Git npm consumers install the repository
root. Its exports point into `ts/src`. Cargo discovers `nightfire` as a workspace
package under `rust/`. Both manifests use the same release version and tag.

## Ownership

| Surface | Owner | Nightfire relationship |
| --- | --- | --- |
| Generic Rust protocol, strategies, registries, validation, hashing, IDs, locators | Nightfire | Owns crate `nightfire` and its release proof |
| Generic TypeScript value, validation, registries, rendering, editing | Nightfire | Owns the npm package and its release proof |
| Generic UI primitives | Poodle | Consumed where justified |
| Product schemas, blocks, registrations, persistence | Froyo and applications | Exposes extension points; absorbs no product policy |
| Underlay media traversal and HTTP adapters | Underlay | Consumes Nightfire; stays outside this repository |
| Cross-repository release and adoption order | Acowtancy Market roadmap | Nightfire does not copy Market cards |

A change belongs here only when it stays useful without an Acowtancy product
schema, service, or application runtime. Otherwise it belongs in the consumer.

## Consumers

Acowtancy consumes Nightfire through the chain Nightfire tag → Underlay swap →
Silo/Farmyard pin. Consumers repin from a tag rather than following `main`, so
nothing reaches them until a release carries it. Any change to the core
vocabulary or schema identity needs Silo to follow, because Silo's pin and
consumer mirrors carry the result. Underlay still hosts a copy of the historical
`underlay-nightfire` crate; its retirement is Underlay's to schedule.

## Rust tranche

The Rust crate owns the durable value and block types, strategies, registries,
structural validation, version coercion, hashing, stable block IDs, and media
locators. It has no Underlay or application dependency.

## TypeScript/Svelte tranche

The TypeScript core and normalization layer stay free of Svelte runtime imports.
Registries hold validators, renderers, and editors behind explicit registration
with type-only Svelte references. Renderer imports load no editor code or
registration side effects.

## Shared data flow

A consumer supplies a `NightfireValue` and its own product registrations. Both
languages validate the same envelope and registered block versions. Save
preparation assigns missing stable IDs and rejects unsupported structures.
TypeScript rendering resolves registered renderers and sanitizes untrusted
markup before HTML insertion.

Nightfire does not persist content, define a product schema, traverse
Underlay-specific media usage, or convert validation errors into HTTP
responses. Those decisions stay with consumers.

## Invariants

- One immutable tag versions both language tranches.
- Rust and TypeScript consume the same root wire fixtures.
- Unknown block types, versions, and legacy envelopes fail closed.
- Rust public behavior matches the extracted generic Underlay crate until an
  explicit contract changes it.
- TypeScript `core` and `validation` have no framework runtime edge.
- Registry imports from Svelte are type-only.
- Renderer graphs contain no editor modules or registration effects.
- Markdown and embedded HTML cross one sanitizer contract before `{@html}`.
- Fixtures are synthetic and contain no production data.

## Proof

Effigy covers Rust format/check/clippy/test/package, TypeScript/Svelte checks,
npm exports and pack contents, both clean Git-consumer paths, version sync, and
cross-language conformance. A green single-language suite is not release proof.

## Change path

Change this file when ownership or tranche boundaries move. Change a contract
when an observable guarantee moves. Update both language proofs and the shared
fixtures in the same change when the wire contract changes.
