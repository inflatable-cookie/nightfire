# Changelog

All notable Nightfire changes are recorded here. Nightfire follows Semantic
Versioning. `0.1.0` is published on npm and tagged `v0.1.0`; that identity is
immutable.

## [Unreleased]

### Added

- Declared the core block vocabulary in `ts/src/core-blocks.ts`, with a test that
  holds each declared capability and its registration together.
- Core catalog self-registration through `./core-blocks`,
  `./editor-registrations`, and `./render-registrations`.
- Block renderers for `table` and `item_list`.
- The `rich_text` block: a renderer and an editor over Poodle's published,
  feature-gated rich-text surface, its empty checker, and the
  `data-nightfire-block="rich_text"` render hook. The block stores the
  ProseMirror document at `data.document` and enables Poodle's whole admitted
  feature set; the image node stays inert until a media source is registered.
- The `download_card` block: a renderer, an editor, and an empty checker over
  `{ description?, files: [{ media_id, description? }] }`, with the
  `data-nightfire-block="download_card"` render hook. Rows resolve their
  reference through the media-source registry and render inert and marked when
  no source is registered or a reference is unknown; the card description and
  the author's file descriptions survive.
- The Svelte-free media-source registry, exported as `./media-source`:
  `registerMediaSource({ pick, resolve })` with a synchronous `resolve`, plus
  `MediaKind`. Module-level rather than a Svelte context, so a renderer resolves
  too, and SSR-safe.
- The npm release automation: candidate identity manifest, archive verifier,
  static workflow guard, and OIDC release workflow. Candidate mode has run green;
  the publish half is unexercised until the next release.

### Removed

- **Breaking:** the `media` block type, its editor, its Svelte picker context
  (`createNightfireMediaContext` / `useNightfireMedia`), and the `./media`
  subpath. `MediaKind` moved to `./media-source`. `./media-locator` keeps its own
  subpath, so a consumer that imported locator helpers from `./media` moves them
  to `./media-locator`. There is no alias and no migration.

### Changed

- Removed the styling and restyling contract recorded earlier the same day. It
  asserted that this package owns a theme surface; the `--nightfire-*` set is an
  application interface swept in by the extraction, and where it belongs is open.

## [0.1.0] - 2026-09-18

### Added

- Standalone Nightfire package extracted from Underlay.
- Framework-free core and validation entry points.
- Explicit renderer, editor, and registry entry points.
- Sanitized markdown rendering and malicious-input proofs.
- Northstar repository documentation and Effigy validation spine.
- Root Cargo workspace and standalone Rust crate `nightfire`.
- Shared Rust/TypeScript wire-fixture, version-sync, packaging, and Git-consumer
  proofs.

### Changed

- Moved TypeScript/Svelte source, tests, scripts, and config under `ts/` while
  preserving the root npm Git-install package and every export subpath.

### Fixed

- Corrected the repository contract: Nightfire owns the Rust crate as well as the
  TypeScript/Svelte package.
