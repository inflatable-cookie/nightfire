# Provenance

## Extraction source

The retained TypeScript/Svelte implementation comes from `inflatable-cookie/underlay` commit
[`7ef7f8e30c3e36fda3a277681405bd5aa5e8703d`](https://github.com/inflatable-cookie/underlay/tree/7ef7f8e30c3e36fda3a277681405bd5aa5e8703d/ts/src/nightfire),
primarily `ts/src/nightfire/`. Adjacent generic helpers came from:

- `ts/src/utils/html.ts` for sanitizer behavior;
- `ts/src/patterns/dom.ts` for stable DOM IDs;
- `ts/src/patterns/media-types/enums.ts` for the retained media-kind type;
- Underlay's Nightfire design-token values for `ts/src/styles.css`.

Tests were extracted from the corresponding Nightfire unit and component tests
at the same source commit. Wire fixtures mirror the Rust assertions named in
[fixtures/wire/v1/README.md](fixtures/wire/v1/README.md).

The Rust implementation comes from the same commit and source tree
`rust/crates/underlay-nightfire` (Git tree
`8f4f38289e40f4e00625745a68843a3e734e4dbb`). Source modules and the 35 source
tests map one-for-one into `rust/nightfire/src`. The standalone crate adds only
the shared-root-fixture integration test under `rust/nightfire/tests`.

## Standalone adaptations

Changes are limited to the repository boundary:

- internal imports now resolve inside this root package;
- the Bun test adapter replaces the source repository's Vitest harness without
  adding Vite or Vitest;
- product-only summary transforms, Acowtancy schema registrations, and inferred
  product question groups were excluded;
- generic markdown and media editors register as wildcard block types instead
  of naming a product schema;
- requested schema IDs are preserved when no schema definition is registered;
- renderer fallback is direct and does not import registration side effects or
  editor modules;
- design-token names use the `--nightfire-*` namespace; retained
  `underlay-*` DOM class selectors preserve extracted markup/style behavior and
  are not an import, dependency, or integration hook;
- block ID generation emits the `nf_` plus simple UUIDv7 form used by the Rust
  wire contract;
- package entrypoints expose only the retained generic surface.
- TypeScript source, tests, scripts, and config moved under `ts/`; the root npm
  manifest retains every existing export name and points each target into
  `ts/src`.
- the Rust package changed from `underlay-nightfire` to `nightfire` and inherits
  version, MIT licence, Rust 1.95 MSRV, edition 2021, and lint posture from the
  root workspace; the crate package carries the same MIT licence text;
- Rust source changes are documentation-only: crate import examples use
  `nightfire`, and source comments no longer name an application or former
  repository owner;
- the crate README removes source-repository integration guidance and keeps the
  generic API and wire examples;
- the Cargo member carries a tracked fixture symlink; Cargo dereferences the
  root fixture into the packaged crate, and the package gate compares the
  packaged bytes with the root before testing the unpacked artifact.

No product blocks, product schemas, raw answer data, or PII were copied in the
first tranche.

## Dependency boundary

Runtime dependencies are recorded in [README.md](README.md). Rust retains only
the source crate's `serde`, `serde_json`, `blake3`, `uuid`, and `thiserror`
dependencies. Svelte is a peer.
Underlay, SvelteKit, Vite, bits-ui, lucide-svelte, zod, and smol-toml are not
dependencies or transitive framework assumptions of the retained source.
