### Added

- `oxlint` with the Cloudflare shared rule set, `oxfmt`, and `knip` as
  devDependencies, wired as `effigy check:lint`, `effigy check:fmt` and
  `effigy check:dead-code` inside `validate`.
- `oxlint.config.ts` overrides, each commented with the fact it encodes: Svelte
  compiler runes are not globals, proof scripts print their result, `any` at the
  public component and registry boundary is the API contract, block data is open
  JSON, and type-aware rules stay off because `check:types` and `check` already
  own type facts.
- `knip.json` with the Effigy-driven proof scripts and the test suites as
  entries, and an `.oxfmtrc.json` that matches the repository's existing
  two-space, no-trailing-comma style.

### Changed

- `effigy check` runs `svelte-check --fail-on-warnings`, so a Svelte compiler
  warning fails validation.
- `ts/tsconfig.json` enables `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, `noImplicitOverride` and `noFallthroughCasesInSwitch`.
  `types: ["bun"]` moved to `ts/tsconfig.tooling.json`, so published `ts/src`
  cannot reference a Bun global.
- `ts/**` source, tests and scripts are formatted by oxfmt once; the rest of the
  change is the strict-flag and lint fixes those gates surfaced.
- `check-boundaries` holds the lock to the published runtime closure instead of
  scanning every byte of `bun.lock`. `knip` parses TOML with `smol-toml`, which
  is a dev tool's own dependency; the manifest scan still refuses a forbidden
  package declared directly in any section.

### Fixed

- `toggleHeaderRow` skips a row or cell the layout no longer has instead of
  reading through it.
- Media locator code-point comparison treats a missing character as code point
  zero rather than asserting it exists.
- Proof scripts and tests guard regex captures, spawn output, schema lookups and
  indexed test data instead of asserting them present.

### Removed

- Internal-only exports `hasContent` (`layout/table-model`) and
  `WILDCARD_SCHEMA` (`registry-map`); neither is reachable from the package
  export map.

### Consumer migration for 0.6.0

- None. No package export, wire shape or runtime dependency changes.
