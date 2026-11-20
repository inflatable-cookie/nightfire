### Fixed

- A schema-specific block label now beats the wildcard label, and registering
  the same `(schema, type)` again updates its label. The wildcard previously
  won, so a product name could never override a core one.
- A slower strategies fetch can no longer overwrite a newer `refresh()` or
  `invalidate()`. An empty strategy list is cached like any other answer
  instead of being refetched on every `ensure()`.
- `createStableId` replaces the module counter behind element ids with a
  per-call random token. The counter drifted across concurrent SSR requests in
  one process; a per-call id carries no request state.
- Media locators now match the Rust crate. The pointer must be non-empty and
  slash-prefixed, a `#` in the block id is refused, a `~` must escape `0` or
  `1`, an array segment is `0` or a digit string without a leading zero, and
  only an own property resolves, so `#/constructor` resolves nothing.
  `resolveNightfireMediaLocator` validates the locator and finds a block nested
  inside another block's data, such as an `item_list` item body.
- `coerceNightfireBlock` returns `null` for a string, number, boolean or array
  instead of fabricating an empty block, and treats a whitespace-only id as
  missing.
- Re-typing a disallowed block to the schema default resets its `data` and
  `version`. The old data belonged to the type it was not.
- A raw legacy string whose only possible home (`markdown`) is not an allowed
  type is dropped instead of becoming an empty block of some other type.
- `validateNightfireValue` and `prepareNightfireForSave` fail closed on a
  non-object value, a hybrid `{ block, blocks }` envelope, and a missing or
  blank schema. A validator that answers with a primitive, an array or a
  typeless object fails the block instead of replacing it with an empty one.
- `package.json` `sideEffects` names `**/editor.ts` and `**/render.ts`, so a
  `layout/render.ts` import is no longer tree-shaken away.

### Changed

- Registries share one keyed-map helper and expose `unregister` and `clear`
  next to `register`. Tests and hot reloads can retire a registration instead
  of leaking process-global state.
- Registry modules keep Svelte type imports only; the Svelte 4 class-component
  union is gone from the editor and render registries.
- `BlockVersionSpec` fields are read-only and the default spec is frozen.
- `.` is Svelte-free and no longer re-exports `strategies` or
  `renderSafeMarkdownPreview`. `renderSafeMarkdownPreview` moved to `./markdown`.
- `check-exports` runtime-imports every plain-TypeScript subpath.

### Removed

- `ts/src/block-editor.ts`, `ts/src/block-registration.ts` and the
  `registerNightfireBlock(s)` helpers in `./editor`. No consumer called them.
- The `./block-editor`, `./block-ids`, `./block-registration`, `./core-blocks`
  and `./media-locator` subpaths.
- `writeNightfireToFormData` (use `writePreparedNightfireToFormData`),
  `coerceBlockVersion` (use `resolveBlockVersion`), the `NightfireDraftValue`
  alias (use `NightfireValue`), and the duplicate `NightfireBlockDefinition`,
  `NightfireTypeOption` and `BlockTypeOptionLike` interfaces (use
  `SchemaDefinition` and `BlockTypeOption` from `./editor-registry`).

### Consumer migration for 0.6.0

- Import `renderSafeMarkdownPreview` from `./markdown`, and import strategies
  from `./strategies` rather than the root.
- Replace `NightfireDraftValue` with `NightfireValue`, and
  `NightfireBlockDefinition` / `NightfireTypeOption` with `SchemaDefinition` /
  `BlockTypeOption` from `./editor-registry`.
- Import `writePreparedNightfireToFormData` instead of
  `writeNightfireToFormData`, and `resolveBlockVersion` instead of
  `coerceBlockVersion`. Both live in `./validation` or `./core`.
- Reach block ids and media locators through `./core`, `./validation` or `.`
  instead of the removed subpaths.
- Expect validation to drop a value with no schema, a hybrid envelope, and a
  raw string whose type is not allowed. Re-key stored media locators with an
  empty pointer (`block#`) or a `#` in the block id before upgrading.
