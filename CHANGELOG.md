# Changelog

All notable Nightfire changes are recorded here. Nightfire follows Semantic
Versioning. `0.1.0` is published on npm and tagged `v0.1.0`; that identity is
immutable.

## [Unreleased]

### Added

- Declared the six-type core vocabulary in `ts/src/core-blocks.ts`, with a test
  that holds each declared capability and its registration together.
- Core catalog self-registration through `./core-blocks`,
  `./editor-registrations`, and `./render-registrations`.
- Block renderers for `table` and `item_list`.
- The `rich_text` block: a renderer and an editor over Poodle's published,
  feature-gated rich-text surface, its empty checker, and the
  `data-nightfire-block="rich_text"` render hook. The block stores the
  ProseMirror document at `data.document` and enables Poodle's whole admitted
  feature set; the image node stays inert until the media-source seam supplies
  it a host.
- The npm release automation: candidate identity manifest, archive verifier,
  static workflow guard, and OIDC release workflow. Candidate mode has run green;
  the publish half is unexercised until the next release.

### Changed

- Removed the styling and restyling contract recorded earlier the same day. It
  asserted that this package owns a theme surface; the `--nightfire-*` set is an
  application interface swept in by the extraction, and where it belongs is open.

## [0.1.0] — 2026-09-18

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
