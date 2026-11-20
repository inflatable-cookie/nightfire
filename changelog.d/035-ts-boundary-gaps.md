### Fixed

- `validateNightfireValue` resolves the block version a custom
  `BlockValidator` answers with. A validator that retyped or re-versioned a
  block could previously carry an unknown version past the save boundary.
  A validator that throws now fails that block closed instead of failing the
  whole save.
- An envelope whose `blocks` member is not an array is rejected rather than
  coerced to an empty list, so a corrupt value fails closed instead of looking
  empty.
- `findNightfireBlockById` resolves a nested block (an `item_list` item body,
  for instance) and no longer throws on a non-object element. Block and media
  lookup checks every top-level block before searching nested ones, matching
  the documented locator contract and the Rust crate.
- A non-string media locator `blockId` is a domain `Error`, not a `TypeError`
  from `.trim()`.
- `normaliseNightfireValue` falls back to the caller's schema when the stored
  one is blank or whitespace.
- `registerBlockVersions` rejects an empty `supported` set or one that omits
  `current`, and stores a frozen copy, matching `BlockVersions::new`.
- `configureNightfireStrategies` and the cache resets clear the previous
  strategy list and error, so a new config cannot inherit either. A stale
  refetch that fails keeps the cached list, so `ensure()` and the store agree.
- `cacheTtl: 0` means "never cache" instead of needing `cacheTtl: -1`.
- A blank slash-command `label` no longer erases the default label, and a
  caret past the end of the value is clamped before matching.

### Changed

- `CoreBlockType` is the exact union of the seven core block names rather than
  `string`, so a name that is not declared fails the completeness test.
- `./markdown` is documented as a mixed barrel: it carries the markdown editor
  and `renderSafeMarkdownPreview`, so it is not a render-only entry point.
  Renderer-only consumers use `./rich-text` or `./renderer`.
- `./rich-text` exports `clearRichTextInlineNodeRenderers` next to register and
  unregister, and `./validation` exports the `BlockValidator` type.

### Consumer migration for 0.6.0

- A custom `BlockValidator` must answer within its type's registered versions;
  a retype to an unregistered type or an unsupported version drops the block.
- Expect `validateNightfireValue` to reject `{ schema, blocks: <non-array> }`
  and to resolve versions again after a validator runs.
- Set `cacheTtl: 0` where `cacheTtl: -1` was used to disable caching, and read
  the strategy list from the store after a failed refetch: it keeps the last
  good list rather than emptying.
- Import `clearRichTextInlineNodeRenderers` from `./rich-text` in test or hot
  reload cleanup, and `BlockValidator` from `./validation` instead of the
  registry module.
