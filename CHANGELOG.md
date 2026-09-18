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
- The npm release automation: candidate identity manifest, archive verifier,
  static workflow guard, and OIDC release workflow. Candidate mode has run green;
  the publish half is unexercised until the next release.

### Changed

- Added the styling and restyling contract: the `--nightfire-*` set is public
  API, renderers carry no scoped styles, and renames are breaking.

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
