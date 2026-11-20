### Fixed

- Changing a block's type keeps its `id` and resets `data` and `version`. The
  old payload no longer carries into a type whose schema rejects it. This holds
  for top-level blocks, field blocks and item-list child blocks.
- A slash command keeps the `id` of the block it was typed into.
- Focus after a slash command lands in the editor that inserted the block, not
  in a sibling editor on the same page.
- Retitling an item list on an empty block writes `items: []`, so the saved
  payload stays schema-valid.
- Item-list buttons are native buttons again. Keyboard activation comes from the
  browser, not a custom Enter and Space handler.
- Item-list controls are styled. Their classes were scoped to another component's
  stylesheet and matched nothing.
- The field editor reloads its strategy when `schema` changes. A failed strategy
  fetch falls back to the registry defaults instead of an unhandled rejection.
- Stored blocks get their ids when the editor takes a value, so blocks no longer
  remount on every keystroke. Fallback ids are unique per editor instance.

### Changed

- The block type picker renders the groups and subcategories that
  `buildGroupedOptions` returns, in that order. It no longer strips a
  `Question - ` prefix from labels or orders subcategories by hard-coded names.
  Consumers that relied on the old subcategory order should order their options.

### Removed

- The unused `removeBlock` and `moveBlock` helpers, the write-only
  `strategiesLoading` and `typeChangeWarning` state, the duplicate
  `SchemaMismatchInfo` type (now imported from `./editor`), the always-null
  `fallbackSchemaId` argument, the unused mode arguments and the duplicate
  random id generator in the Poodle adapter.
