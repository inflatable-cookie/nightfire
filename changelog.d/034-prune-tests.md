### Changed

- `getBlockEditor` takes `null` or `undefined` as the schema and returns the
  wildcard editor, as `getBlockRenderer` already does. The signature said
  `string` only, so the wildcard lookup did not type-check.
- `effigy check:types` also type-checks `ts/scripts` and `ts/tests`, through
  `ts/tsconfig.tooling.json`. The source check is unchanged.

### Removed

- The test-only `ts/tests/vitest.ts` shim. Tests import `bun:test` directly,
  and the registry tests retire their registrations with `clear*` instead of a
  no-op `resetModules`.
- Stale and duplicate tests: the dead `@vitest-environment` pragmas, the XSS
  cases that `ts/tests/security/sanitization.test.ts` already covers, a
  `MediaKind` constant echo, a duplicate v1 envelope rejection, and the mocked
  catalog-loading tests. The catalog tests now check real registrations against
  `CORE_BLOCK_TYPE_NAMES`.
- The 25ms sleep after each component test. Cleanup flushes Svelte instead.
