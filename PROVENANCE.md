# Provenance

## Extraction source

The retained implementation comes from `inflatable-cookie/underlay` commit
[`7ef7f8e30c3e36fda3a277681405bd5aa5e8703d`](https://github.com/inflatable-cookie/underlay/tree/7ef7f8e30c3e36fda3a277681405bd5aa5e8703d/ts/src/nightfire),
primarily `ts/src/nightfire/`. Adjacent generic helpers came from:

- `ts/src/utils/html.ts` for sanitizer behavior;
- `ts/src/patterns/dom.ts` for stable DOM IDs;
- `ts/src/patterns/media-types/enums.ts` for the retained media-kind type;
- Underlay's Nightfire design-token values for `src/styles.css`.

Tests were extracted from the corresponding Nightfire unit and component
tests at the same source commit. Wire fixtures mirror the Rust assertions named
in [fixtures/wire/v1/README.md](fixtures/wire/v1/README.md); Rust remains in
Underlay.

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

No product blocks, product schemas, Rust code, raw answer data, or PII were
copied.

## Dependency boundary

Runtime dependencies are recorded in [README.md](README.md). Svelte is a peer.
Underlay, SvelteKit, Vite, bits-ui, lucide-svelte, zod, and smol-toml are not
dependencies or transitive framework assumptions of the retained source.
