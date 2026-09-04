# Contract 002 — Package boundary

- Status: Active
- Scope: Public package and retained dependency graph
- Owner: Nightfire maintainers

## Ownership

Nightfire owns generic TypeScript/Svelte block values, normalization,
validation, registries, rendering, editing, markdown behavior, and media
locators. Consumers own product schemas, product blocks, registrations,
persistence policy, authorization, and application services.

Rust wire types remain in Underlay. Nightfire conforms to committed wire
fixtures and does not move or duplicate the Rust implementation.

## Public surface

- Export explicit entry points for core, validation, registries, rendering,
  editing, strategies, media, and styles.
- Keep `core` and `validation` free of Svelte runtime imports.
- Allow registry modules to import Svelte types only.
- Keep renderer imports free of editor modules and registration effects.
- Keep editor and renderer registration as explicit consumer opt-ins.

## Data and trust

- Reject unknown block versions and legacy sibling `block` envelopes.
- Do not invent migrations during normalization.
- Assign missing `nf_` block IDs during save preparation.
- Treat markdown and embedded HTML as untrusted.
- Sanitize before every Svelte `{@html}` path in browser, SSR, and desktop
  WebView-shaped execution.

## Dependencies

Every runtime dependency needs direct retained-source evidence. Forbidden
framework, product, and duplicate utility dependencies must remain absent from
the manifest, lockfile, and source graph.

## Proof

The package boundary is not established by prose alone. Export, source-graph,
bundle, wire, sanitization, component, type, and package-content checks must
remain executable through Effigy.
