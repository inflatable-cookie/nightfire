# Working rules

## Boundary

Nightfire owns generic TypeScript/Svelte block values, normalization,
validation, registries, rendering, editing, markdown behavior, and media
locators. Consumers own product schemas, product blocks, persistence policy,
and application services.

Rust wire types remain in Underlay. TypeScript changes must conform to the
committed wire fixtures; this repository does not move or duplicate Rust.

## Import safety

- `@inflatable-cookie/nightfire/core` and `/validation` are framework-free.
- Registries may import Svelte types but no Svelte runtime.
- `/renderer` may import renderer components. It must not import editors,
  editor registrations, or registration side effects.
- Editor and renderer registrations are explicit opt-ins.

## Trust boundary

Markdown and embedded HTML are untrusted. Sanitize before `{@html}` in browser,
SSR, and Tauri WebView-shaped execution. Unknown block versions and legacy
envelopes fail closed. Fixtures contain synthetic values only.

## Release boundary

Implementation pull requests do not tag, publish, merge, or modify consumers.
Release and adoption require separate operator approval.
