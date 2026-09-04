# Changelog

All notable Nightfire changes are recorded here. Nightfire follows Semantic
Versioning once releases begin. `0.1.0` is the manifest version only; no release
tag or package publication has been authorized.

## [Unreleased]

### Added

- Standalone Nightfire package extracted from Underlay.
- Framework-free core and validation entry points.
- Explicit renderer, editor, and registry entry points.
- Sanitized markdown rendering and malicious-input proofs.
- Northstar repository documentation and Effigy validation spine.
- Root Cargo workspace and standalone Rust crate `nightfire`.
- Shared Rust/TypeScript wire-fixture, version-sync, packaging, and Git-consumer proofs.

### Changed

- Moved TypeScript/Svelte source, tests, scripts, and config under `ts/` while
  preserving the root npm Git-install package and every export subpath.

### Fixed

- Corrected the repository contract: Nightfire owns the Rust crate as well as
  the TypeScript/Svelte package. Release remains separately blocked.
