# Package boundary

The public package and its retained dependency graph.

## Ownership

Nightfire owns generic Rust and TypeScript/Svelte block values, normalization,
validation, strategies, registries, version coercion, hashing, block IDs, media
locators, rendering, editing, and markdown behavior. Consumers own product
schemas, product blocks, registrations, persistence policy, authorization,
media traversal integrations, HTTP adaptation, and application services.

The authoritative Rust crate is `nightfire`. Underlay's historical
`underlay-nightfire` crate may survive only as a temporary re-export facade
after consumer migration begins.

## Public surface

- Expose the Rust crate through the root Cargo workspace and the npm package
  through the root `package.json`, from one immutable repository version.
- Keep implementation in explicit `rust/` and `ts/` tranches with shared root
  wire fixtures.
- Export explicit entry points for core, validation, registries, rendering,
  editing, strategies, media, and styles.
- Keep `core` and `validation` free of Svelte runtime imports.
- Allow registry modules to import Svelte types only.
- Keep renderer imports free of editor modules, registration effects, and
  runtime Poodle imports. Type-only Poodle imports pass.
- Keep `@inflatable-cookie/poodle-svelte` an optional peer of editor entry
  points only. Declare it as a patch range within one Poodle minor
  (`>=0.4.4 <0.5` today), not an exact version: below `1.0` a Poodle minor is
  breaking and moves the range in a Nightfire release, while a Poodle patch
  needs none (Tom, 2026-09-27).
- Keep editor and renderer registration as explicit consumer opt-ins.

## Data and trust

- Reject unknown block versions and legacy sibling `block` envelopes.
- Do not invent migrations during normalization.
- Assign missing `nf_` block IDs during save preparation.
- Treat markdown and embedded HTML as untrusted.
- Sanitize before every Svelte `{@html}` path in browser, SSR, and desktop
  WebView-shaped execution.

## Dependencies

Every runtime dependency needs direct retained-source evidence, recorded in
`PROVENANCE.md` and the package documentation. Forbidden Underlay, framework,
product, and duplicate utility dependencies stay absent from both manifests,
locks, and source graphs. `@inflatable-cookie/poodle-svelte` is an optional
peer for editors; renderer graphs must not reach it at runtime.

## Proof

The package boundary is not established by prose alone. Cargo format/check/
clippy/test/package, npm export/source-graph/bundle/pack, wire, sanitization,
component, type, version-sync, and clean Git-consumer checks must remain
executable through Effigy.
