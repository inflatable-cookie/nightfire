### Changed

- The QA proofs fail closed where they used to pass over a blind spot.
  `check-boundaries` guards every `<block>/editor.ts` rather than three named
  blocks, and reports a runtime `svelte` import wherever it sits instead of
  reading line one. `check-colour-literals` treats a `var(--…)` name as a token,
  so `--nightfire-color-red` is no longer a finding, and it sees `color-mix()`
  with a literal argument. The schema validator refuses a keyword it cannot
  enforce and compares `enum`, `const` and `uniqueItems` by value, not by
  serialised key order.

- The block payload schemas state what the renderers already assume: cell
  alignment is one of the documented values or null, `item_list.intro` is a
  string or null, and `video` width and height are at least 1. A payload that
  wrote an arbitrary alignment string now fails validation, so a consumer
  republication of stored block data should expect those values to be refused.

- The npm release proofs share one candidate-manifest reader in
  `ts/scripts/npm-publication.ts` and hash with `node:crypto` instead of a
  `shasum` subprocess. A manifest read back is structure-checked by name and a
  flag passed without a value is refused rather than ignored.

### Added

- Unit tests for the hardened colour, schema and candidate-manifest proofs, and
  for the test runner refusing a selector that names no test file.
