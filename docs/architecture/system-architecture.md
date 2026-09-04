# System architecture

## Repository shape

Nightfire is one versioned repository with two implementation tranches:

```text
package.json        npm Git-install entry for @inflatable-cookie/nightfire
Cargo.toml          Cargo workspace and shared Rust release metadata
ts/                 TypeScript/Svelte source, tests, and config
rust/               Rust crate `nightfire` and tests
fixtures/wire/       shared versioned cross-language contract
```

The root npm manifest is deliberate: Git npm consumers install the repository
root. Its exports point into `ts/src`. Cargo discovers `nightfire` as a workspace
package under `rust/`. Both manifests use the same release version and tag.

Market Card 278 established this shape. The repository cannot release until
the card receives independent exact-head review and release is separately
authorized.

## Rust tranche

The Rust crate owns the durable value and block types, strategies, registries,
structural validation, version coercion, hashing, stable block IDs, and media
locators. It has no Underlay or application dependency.

## TypeScript/Svelte tranche

The TypeScript core and normalization layer remain free of Svelte runtime
imports. Registries hold validators, renderers, and editors behind explicit
registration with type-only Svelte references. Renderer imports do not load
editor code or registration side effects.

## Shared data flow

A consumer supplies a `NightfireValue` and its own product registrations. Both
languages validate the same envelope and registered block versions. Save
preparation assigns missing stable IDs and rejects unsupported structures.
TypeScript rendering resolves registered renderers and sanitizes untrusted
markup before HTML insertion.

Nightfire does not persist content, define a product schema, traverse
Underlay-specific media usage, or convert validation errors into HTTP
responses. Those decisions remain with consumers.

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

Change architecture when ownership or tranche boundaries move. Change contracts
when observable guarantees move. Update both language proofs and shared
fixtures in the same batch when the wire contract changes.
