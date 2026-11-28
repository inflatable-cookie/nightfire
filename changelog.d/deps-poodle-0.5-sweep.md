### Changed

- The optional `@inflatable-cookie/poodle-svelte` peer accepts `>=0.4.4 <0.6`,
  so editor consumers can take Poodle `0.5` or stay on `0.4`. The dev pin moves
  to `0.5.0`. None of Poodle's `0.5` migration steps touch Nightfire.
- Runtime dependencies `isomorphic-dompurify` `3.23.0` and `marked` `18.3.0`.
  Dev tools and test dependencies moved to their latest compatible versions.
- The Rust workspace MSRV is `1.97.1` (was `1.95`). Edition 2021 is unchanged.
  `Cargo.lock` is refreshed within semver-compatible ranges.

### Fixed

- `check:renderer-consumer` exposes JSDOM's `customElements`, which Svelte
  `5.59` reads when it sets element attributes.

### Consumer migration

- Rust consumers need rustc `1.97.1` or newer.
- None for npm consumers on Poodle `0.4`.
