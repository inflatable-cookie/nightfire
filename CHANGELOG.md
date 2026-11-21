# Changelog

All notable Nightfire changes are recorded here. Nightfire follows Semantic
Versioning. `0.1.0` is published on npm and tagged `v0.1.0`; that identity is
immutable.

## [Unreleased]

## [0.6.0] - 2026-11-21

**Breaking:** under `0.x` the minor is the breaking boundary, so
`^0.5.0` does not accept `0.6.0`. The npm surface loses five
subpaths, moves `renderSafeMarkdownPreview`, and renames several
helpers; the Rust crate removes two zero-caller APIs and tightens
invariants; stored payloads and locators that relied on lenient
parsing now fail closed. Each entry below names its replacement.
`0.5.0` stays the latest published release until `0.6.0` is tagged
and published.

### Added

- Unit tests for the hardened colour, schema and candidate-manifest
  proofs, and for the test runner refusing a selector that names no
  test file.
- `oxlint` with the Cloudflare shared rule set (`--type-aware`),
  `oxfmt`, and `knip` as devDependencies, wired as
  `effigy check:lint`, `effigy check:fmt` and `effigy check:dead-code`
  inside `validate`.
- `oxlint.config.ts` with each narrow override documented, tooling
  tsconfigs so type-aware linting resolves Bun types for scripts and
  tests without leaking them into `ts/src`, a `knip.json` with the
  proof scripts and test suites as entries, and an `.oxfmtrc.json`
  matching the repository's two-space, no-trailing-comma style.
- `./rich-text` exports `clearRichTextInlineNodeRenderers` next to
  register and unregister, and `./validation` exports the
  `BlockValidator` type.

### Changed

- Root `.` is Svelte-free and no longer re-exports `strategies` or
  `renderSafeMarkdownPreview`. Import `renderSafeMarkdownPreview`
  from `./markdown` and strategies from `./strategies`.
- Registries share one keyed-map helper and expose `unregister` and
  `clear` next to `register`, so tests and hot reloads can retire a
  registration instead of leaking process-global state.
- Registry modules keep Svelte type imports only; the Svelte 4
  class-component union is gone from the editor and render
  registries.
- `BlockVersionSpec` fields are read-only and the default spec is
  frozen.
- `check-exports` runtime-imports every plain-TypeScript subpath.
- `CoreBlockType` is the exact union of the seven core block names
  rather than `string`, so a name that is not declared fails the
  completeness test.
- `./markdown` is documented as a mixed barrel: it carries the
  markdown editor and `renderSafeMarkdownPreview`, so it is not a
  render-only entry point. Renderer-only consumers use `./rich-text`
  or `./renderer`.
- `getBlockEditor` takes `null` or `undefined` as the schema and
  returns the wildcard editor, as `getBlockRenderer` already does.
- `effigy check:types` also type-checks `ts/scripts` and `ts/tests`
  through `ts/tsconfig.tooling.json`. `effigy check` runs
  `svelte-check --fail-on-warnings`.
- `ts/tsconfig.json` enables `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, `noImplicitOverride` and
  `noFallthroughCasesInSwitch`. `types: ["bun"]` moved to
  `ts/tsconfig.tooling.json`, so published `ts/src` cannot reference
  a Bun global.
- `check-boundaries` holds the lock to the published runtime closure
  instead of scanning every byte of `bun.lock`. `knip` parses TOML
  with `smol-toml`, which is a dev tool's own dependency.
- `BlockVersions` and `NightfireMediaLocator` fields are private.
  Read them with `current()`, `supported()`, `block_id()` and
  `data_pointer()`; build a `BlockVersions` with
  `BlockVersions::new`, which rejects an empty supported set or one
  that omits `current`. `registerBlockVersions` enforces the same
  rule on the TypeScript side and stores a frozen copy.
- `MultiConfig::with_max_blocks` returns
  `Result<MultiConfig, MultiConfigError>` and rejects a maximum below
  the minimum, which includes `0`. Handle the `Result`, for example
  with `?`.
- `Block::VERSIONS` must list at least one version. `active_version`,
  `versions` and `export` panic when it is empty.
- Validation and `StrategyRegistry::validate` need only
  `C: PartialEq`; the registry storage no longer requires `Eq + Hash`
  on the category type. Validation no longer allocates on the happy
  path.
- `SchemaId` implements `Display`, `AsRef<str>` and `Borrow<str>`.
  `BlockData` and `NightfireValue` implement `PartialEq`;
  `NightfireValidationError` implements `PartialEq` and `Eq`.
- Media locators match across Rust and TypeScript. The pointer must be
  non-empty and slash-prefixed, a `#` in the block id is refused, a
  `~` must escape `0` or `1`, an array segment is `0` or a digit
  string without a leading zero, and only an own property resolves.
  `resolveNightfireMediaLocator` validates the locator and finds a
  block nested inside another block's data. Re-key stored locators
  with an empty pointer (`block#`) or a `#` in the block id before
  upgrading.
- A media locator resolves by one rule in both languages: top-level
  blocks answer before nested ones, a nested payload is a block only
  with an `id`, a string `type` and a `data`, and nested traversal
  visits array items in index order and object keys in ascending
  code-point order. A stored locator that pointed at plain payload
  metadata or relied on key insertion order may resolve differently;
  re-key it.
- `coerceNightfireBlock` returns `null` for a string, number, boolean
  or array instead of fabricating an empty block, and treats a
  whitespace-only id as missing. Re-typing a disallowed block to the
  schema default resets its `data` and `version`.
- A raw legacy string whose only possible home (`markdown`) is not an
  allowed type is dropped instead of becoming an empty block of some
  other type.
- `validateNightfireValue` and `prepareNightfireForSave` fail closed
  on a non-object value, a hybrid `{ block, blocks }` envelope, and a
  missing or blank schema. A validator that answers with a primitive,
  an array or a typeless object fails the block instead of replacing
  it with an empty one. Expect validation to drop a value with no
  schema, a hybrid envelope, and a raw string whose type is not
  allowed.
- `validateNightfireValue` resolves the block version a custom
  `BlockValidator` answers with, and a validator that throws fails
  that block closed instead of failing the whole save. A custom
  `BlockValidator` must answer within its type's registered versions:
  a retype to an unregistered type or an unsupported version drops the
  block, and an explicit `version` that is not a string is rejected
  rather than coerced. An envelope whose `blocks` member is not an
  array is rejected rather than coerced to an empty list.
- `normaliseNightfireValue` falls back to the caller's schema when
  the stored one is blank or whitespace.
- `configureNightfireStrategies` and the cache resets clear the
  previous strategy list and error, so a new config cannot inherit
  either. A stale refetch that fails keeps the cached list, so
  `ensure()` and the store agree. `cacheTtl: 0` means "never cache"
  instead of needing `cacheTtl: -1`.
- A schema-specific block label now beats the wildcard label, and
  registering the same `(schema, type)` again updates its label.
- A slower strategies fetch can no longer overwrite a newer
  `refresh()` or `invalidate()`. An empty strategy list is cached
  like any other answer.
- `createStableId` replaces the module counter behind element ids
  with a per-call random token, so concurrent SSR requests in one
  process share no request state.
- A blank slash-command `label` no longer erases the default label,
  and a caret past the end of the value is clamped before matching.
- `package.json` `sideEffects` names `**/editor.ts` and
  `**/render.ts`, so a `layout/render.ts` import is no longer
  tree-shaken away.
- `sanitizeSvgHtml` drops `style` attributes and `<style>` elements.
  An icon that relied on inline `style` or an embedded stylesheet
  must use presentation attributes or the consumer's own stylesheet.
- A `table` cell flagged as a header renders as `<th>` inside a body
  row, not only in an all-header group. The `item_list` renderer
  forwards `value` to its child renderers, as `NightfireRenderer`
  does.
- Markdown sanitization runs through one shared helper for the
  markdown block, table cells and the editor preview.
- The block type picker renders the groups and subcategories that
  `buildGroupedOptions` returns, in that order. It no longer strips a
  `Question - ` prefix from labels or orders subcategories by
  hard-coded names; consumers supply labels and order through
  `groupedOptions`.
- `buildGroupedOptions` orders the three generic categories as `Text`
  (1), `Media` (2), and `Layout` (3).
- Changing a block's type keeps its `id` and resets `data` and
  `version`, for top-level, field and item-list child blocks alike.
  A slash command keeps the `id` of the block it was typed into, and
  focus lands in the editor that inserted the block.
- The QA proofs fail closed where they used to pass over a blind
  spot. `check-boundaries` guards every `<block>/editor.ts` and
  reports a runtime `svelte` import wherever it sits; it also checks
  the root `.` export against Svelte and `./strategies`, checks
  `Cargo.lock` against the forbidden list, and bundles the public
  `validation` and `renderer` entries. `check-colour-literals` treats
  a `var(--...)` name as a token and sees `color-mix()` with a literal
  argument. The schema validator refuses a keyword it cannot enforce
  and compares `enum`, `const` and `uniqueItems` by value. The schema
  validator applies a `$ref` target and the keywords beside it, and
  accepts array-form `type` such as `["string", "null"]`.
- The block payload schemas state what the renderers already assume:
  cell alignment is one of the documented values or null,
  `item_list.intro` is a string or null, and `video` width and height
  are at least 1. A payload that wrote an arbitrary alignment string
  now fails validation, so a consumer republication of stored block
  data should expect those values to be refused.
- The npm release proofs share one candidate-manifest reader and hash
  with `node:crypto` instead of a `shasum` subprocess. A manifest read
  back is structure-checked by name and a flag passed without a value
  is refused. `verify-npm-candidate` refuses an unknown or repeated
  flag, and reports a flag followed by another flag as `--flag
  requires a value`.
- `check-renderer-consumer` takes the Svelte version from
  `devDependencies.svelte` and imports the renderer entries through
  the package export map.
- Pin the Rust toolchain to 1.100.0 with `rustfmt` and `clippy`
  components. The crate's Rust 1.95 MSRV and edition 2021 are
  unchanged.
- `AGENTS.md` records the `hill-climb` standing quality gate: rubric,
  verified floor at `7297392` (7.5/10 overall; 8/10 except TS editors
  and shell at 7.5/10), worker rating rule, reviewer send-back rule.

### Fixed

- A strategy that sets only `allowed_types` now rejects a block whose
  type is not listed. It previously accepted every type. Check every
  strategy that sets only `allowed_types`: any stored block type
  missing from that list is now rejected.
- `coerce_block_versions` resolves every block before it changes any,
  so a failure leaves the value unchanged instead of half-upgraded.
- `NightfireMediaLocator::new` and `parse` reject a block id that
  contains `#`, an empty pointer, and a `~` that does not escape `0`
  or `1`.
- `CardinalityMismatch` displays "expected exactly 1 block, got 0"
  rather than Rust Debug syntax.
- A `table` with several sections and no `section` on its rows no
  longer throws a duplicate-key error. A `table` alignment value
  outside the documented sets is dropped, not written into a style
  attribute. A `table` row without `cells` is skipped rather than
  crashing the renderer.
- A `video` embed id is percent-encoded, so a crafted id cannot break
  out of the `src`. A `video` block title containing `$&` is written
  literally, and a pasted frame's own `title` is kept. A `video`
  whose markup is only whitespace after sanitizing renders
  `data-embed-state="inert"`, not `"ready"`.
- A rich-text `colspan`, `rowspan` or `orderedList` `start` that is not
  a positive integer is dropped, so `NaN`, `Infinity`, zero or
  negative values never reach HTML. Spans above the HTML limits (1000
  columns, 65534 rows) are dropped too.
- An unknown rich-text container with empty `content` keeps its
  (empty) children instead of showing a fallback label. A node with an
  empty `type` emits nothing. A rich-text `data:image/svg+xml` image
  is dropped; only png, jpeg, gif, webp and avif data URLs are
  admitted. A rich-text link with `target="_blank"` gets
  `rel="noopener noreferrer"`.
- An `image` or `download_card` whose media source throws, or resolves
  without a URL, renders inert instead of throwing. A
  `download_card` link admits only relative, `http`, `https` and
  `blob` URLs. A markdown child inside an `item_list` item renders
  through the markdown renderer, as it does at the top level.
- Table span editing, standalone editor identity, picker handling,
  input ids and video state synchronization in the block editors,
  with the table grid extracted into `table-model.ts`.
- Clearing a `table` caption now removes `caption` from `block.data`
  instead of restoring the previous value.
- `NightfireEditor` with `required` now checks structural emptiness,
  so a mounted draft block with no content yet is preserved rather
  than overwritten.
- `ImageEditor`, `DownloadCardEditor`, and
  `createRichTextImageRequest` guard `mediaSource.resolve()` and
  `pick()` with `try/catch` and require a non-blank `url` before
  using a resolved media entry.
- `DownloadCardEditor` keys file rows by unique `media_id` (index
  fallback only on duplicates) so externally authored blocks with
  duplicate `media_id` entries do not throw `each_key_duplicate` and
  removing a row no longer remounts survivors.
- `ItemListEditor` and `TableEditor` clear pending confirmation
  dialogs whenever items, rows, or columns change so a non-modal
  `alertdialog` cannot act on a stale index.
- `NightfireEditor` focuses editing controls (`textarea`,
  `[contenteditable="true"]`, `input`, `select`) before falling back
  to `button` after inserting a block via slash commands.
- `VideoEditor` reconciles incoming `embed` updates structurally
  (`provider`, `id`, `originalUrl`, `originalEmbed`) instead of by
  object identity, so parents that clone `value` in `onChange` do not
  overwrite the URL input mid-edit. It falls back to `originalEmbed`
  when `originalUrl` is absent, so reloading embeds authored from
  pasted `<iframe>` markup populates the input.
- `NightfireFieldBlockShell` strips synthetic
  `nightfire-unsaved-block-*` fallback ids before forwarding block
  updates, letting `prepareNightfireForSave` assign persistent `nf_*`
  ids.
- `TableEditor` clamps selection anchor coordinates alongside focus
  coordinates when `block` shrinks externally, clears editing mode on
  cell focus, and adds `justify` and `baseline` alignment options
  matching the table schema. Its span reader caps `colspan` at 1000
  and `rowspan` at 65534, matching the renderer. `table-model.ts`
  clamps a stored `rowspan` to the rows the table actually has and
  caps the slots one cell can allocate, and reads the largest row end
  with a loop instead of a `Math.max(...)` spread.
- `TableEditor` lands on column 0 of the row it appends when Tab leaves
  the last cell, so the next Tab walks the new row instead of
  appending another. Ctrl/Cmd+Shift+S on an unsplittable cell is a
  no-op that neither emits a block nor clears a pending confirmation.
- `NightfireEditor` closes the slash palette on structural block
  changes while a content edit keeps it open, resets
  `lastSchemaMismatchReported` when the mismatch clears or the schema
  changes, and initialises a required empty value once the strategy
  has settled, emitting it through `onChange` for controlled callers
  without `bind:value`. The required message is a `role="alert"`.
  It re-initialises a required value when the `schema` prop changes.
- `NightfireBlockEditor` keys the mounted editor by block id and
  type, so a sibling block of the same type mounts without the
  previous block's local state; it keeps the mounted editor when an
  id-less block mints its first `nf_*` id, drops the legacy
  `{ block }` unwrap, and drops the unnecessary
  `render-registrations` side-effect import.
- `NightfireEditor` verifies the slash-command target block still
  exists and has `type === "markdown"` before applying a slash
  command.
- `MarkdownEditorSurface` renders its label text as a plain element
  instead of wrapping the toolbar, textarea and preview in one
  `<label>`.
- The block editors that copy a block id (`RichTextEditor`,
  `ImageEditor`, `VideoEditor`, `DownloadCardEditor`,
  `MarkdownEditor`) read `block?.id`, so a missing block no longer
  throws.
- Focus after a slash command lands in the editor that inserted the
  block, not in a sibling editor on the same page. Retitling an item
  list on an empty block writes `items: []`, so the saved payload
  stays schema-valid. Item-list buttons are native buttons again, and
  item-list controls are styled. The field editor reloads its strategy
  when `schema` changes, falling back to the registry defaults on a
  failed fetch instead of an unhandled rejection. Stored blocks get
  their ids when the editor takes a value, so blocks no longer
  remount on every keystroke.
- `ItemListEditor` keys child blocks by their id, so moving or
  removing a sibling no longer remounts the editors that did not
  change, and typing the list title clears a pending item-removal
  confirmation like an item title edit does. Outer items are keyed by
  object identity, and a pending removal dialog is dropped when the
  list shrinks past its item.
- `ImageEditor` drops invalid out-of-enum `sizing` values when editing
  other fields, and ignores a pending `mediaSource.pick()` result
  after unmount so `onChange` never fires post-teardown.
- `SlashCommandPalette` keeps keyboard focus on the combobox, exposes
  `role="combobox"` with `aria-expanded` on the search input, and
  tracks the focused option with `aria-activedescendant`, so Enter can
  no longer activate a row other than the one the user is on.
- `ImageEditor`, `DownloadCardEditor`, `VideoEditor` and `TableEditor`
  give their `TextInput`s explicit `ariaLabel`s matching their
  placeholders.
- `toggleHeaderRow` skips a row or cell the layout no longer has
  instead of reading through it.
- Media locator code-point comparison treats a missing character as
  code point zero rather than asserting it exists.
- Proof scripts and tests guard regex captures, spawn output, schema
  lookups and indexed test data instead of asserting them present.
  The boundary check strips comments before it reads imports, so a
  doc-comment example cannot trip it. The colour-literal check no
  longer names a hyphenated word such as `red-pulse`, or a CSS math
  function such as `tan(45deg)`, as a colour. `run-test-files` exits 1
  when a child test process ends without an exit code, and
  `check-git-consumer` stops when `git rev-parse HEAD` fails.
- `readNpmPublicationAuthority` refuses a `null` or array
  `npmPublication` with the same message as an absent one.
- The CI MSRV override is fixed, and the boundary,
  renderer-consumer, schema, CLI flag, and colour-literal proofs are
  strengthened.
- Scope the Cargo workspace version match to `[workspace.package]`,
  reuse the comment-aware import reader for the forbidden-package
  scan, keep the render catalog out of the block-editor module set in
  the boundary proof, await Svelte 5 async unmount before the next
  component test starts, and exit nonzero when a sanitization child is
  signal-killed.
- Reject malformed explicit block versions, guard synchronous
  strategy fetch failures, validate version registrations and content
  checkers, keep media lookup paths on the same nested-block rule, and
  fall back from blank schema default types.
- The 25ms sleep after each component test is gone; cleanup flushes
  Svelte instead.

### Removed

- **Breaking:** the `./block-editor`, `./block-ids`,
  `./block-registration`, `./core-blocks` and `./media-locator`
  subpaths. Reach block ids and media locators through `./core`,
  `./validation` or `.` instead.
- **Breaking:** `renderSafeMarkdownPreview` moved from `.` to
  `./markdown` (root `.` is now Svelte-free; a one-line `praxis`
  import update).
- **Breaking:** `writeNightfireToFormData` (use
  `writePreparedNightfireToFormData`), `coerceBlockVersion` (use
  `resolveBlockVersion`), the `NightfireDraftValue` alias (use
  `NightfireValue`), and the duplicate `NightfireBlockDefinition`,
  `NightfireTypeOption` and `BlockTypeOptionLike` interfaces (use
  `SchemaDefinition` and `BlockTypeOption` from
  `./editor-registry`). `ts/src/block-editor.ts`,
  `ts/src/block-registration.ts` and the `registerNightfireBlock(s)`
  helpers in `./editor` are gone; no consumer called them.
- **Breaking:** the duplicate `SchemaMismatchInfo` type (import from
  `./editor`), the always-null `fallbackSchemaId` argument, the
  unused `removeBlock` and `moveBlock` helpers, write-only editor
  state, unused mode arguments, the duplicate random id generator in
  the Poodle adapter, and the unused `onBlockContextChange` prop from
  `NightfireMultiBlockItem`.
- **Breaking:** the leaked Acowtancy question-prefix stripping and
  hard-coded question subcategories in the block type picker.
  Consumers supply labels and order via `groupedOptions`.
- **Breaking:** the tightened `schemas/blocks/{table,item_list,video}.schema.json`
  (cell alignment enum, `intro` string-or-null, `video` dimensions
  minimum 1). Silo re-mirrors on repin.
- `resolve_block_implementation` and
  `NightfireMediaLocator::find_block`. Neither had a caller.
- The test-only `ts/tests/vitest.ts` shim. Tests import `bun:test`
  directly, and registry tests retire registrations with `clear*`.
- Stale and duplicate tests: dead `@vitest-environment` pragmas, XSS
  cases already covered by the sanitization suite, a `MediaKind`
  constant echo, a duplicate v1 envelope rejection, and mocked
  catalog-loading tests now checking real registrations against
  `CORE_BLOCK_TYPE_NAMES`.
- `runCargo` in `rust-route.ts`, which had no caller. The duplicate
  `ts/tests/nightfire/validation.test.ts`, covered by
  `validator-registry.test.ts`.
- Internal-only exports `hasContent` (`layout/table-model`) and
  `WILDCARD_SCHEMA` (`registry-map`); neither is reachable from the
  package export map.

## [0.5.0] - 2026-10-25

### Added

- A public `./rich-text` entry point that renders stored ProseMirror documents
  to sanitized HTML and accepts typed, schema-scoped inline-node renderers, so a
  consumer can display its own node (for example `math_inline` with a `latex`
  attribute) inside a sentence. Registrations are exact-scoped to one schema,
  cannot override an admitted built-in node, and compose the node's marks.
  Unregistered or failed custom leaves render a visible escaped fallback; the
  raw serializer stays internal, so no unsanitized path is presented as safe for
  HTML insertion. The editor vocabulary, wire format and emptiness semantics are
  unchanged.

### Changed

- Local Rust development commands run through Oxide, a host-wide build pool that
  owns build output. This is contributor tooling only: no published API, wire
  format, dependency or MSRV change. CI and intentional Cargo proofs still run
  Cargo, and the crate builds by hand.

## [0.4.1] - 2026-09-27

### Changed

- The optional `@inflatable-cookie/poodle-svelte` peer is now the range
  `>=0.4.4 <0.5` instead of exactly `0.4.4`, so a Poodle patch release no
  longer forces a new Nightfire release. Below `1.0` a Poodle minor is the
  breaking boundary and still needs a Nightfire release. The dev dependency
  stays at `0.4.4`.

## [0.4.0] - 2026-09-27

### Removed

- **Breaking:** `@inflatable-cookie/poodle-svelte` is no longer a hard
  dependency. It is an optional peer of editor entry points. A renderer-only
  consumer must not rely on Nightfire installing Poodle.

### Added

- A Poodle-free rich-text renderer that serializes the stored ProseMirror JSON
  vocabulary to semantic HTML and sanitizes it before `{@html}`.
- A Poodle-free video embed renderer that ports Poodle's `renderEmbed`
  allow-list (youtube, vimeo, audioboom, plus pasted `originalEmbed`).
- `check:boundaries` fails if a runtime import reachable from `./renderer`,
  `./render-registrations`, `./core-blocks`, or a block renderer reaches Poodle.
  Type-only imports pass.
- `check:renderer-consumer` installs Nightfire without Poodle and renders every
  core block through the renderer entry points.

### Changed

- Rich-text and video renderers no longer import Poodle at runtime. Editors
  still do.

## [0.3.1] - 2026-09-27

### Added

- Component tests that author each core block through its editor and prove the stored payload against
  the published document and the `core-payloads` representative keys.

### Changed

- Schema proof: each core payload document is checked against a representative
  stored payload in the shared `core-payloads` wire fixture, including optional
  editor-written fields, not against examples local to `check-schemas.ts`.

### Fixed

- The `table` payload document no longer requires `section` on a row. The editor
  omits it on new rows and only round-trips a value it does not author.

## [0.3.0] - 2026-09-27

### Added

- `--nightfire-color-selection`, the slash palette's selected-item colour, so the
  highlight is a named token rather than two literal alphas.

### Changed

- **Breaking:** the `svelte` peer range is now `>=5.56.8 <6`, up from
  `>=5.38.6 <6`, to match Poodle's own Svelte peer. Poodle 0.4.2 already
  required 5.56.8, so a consumer below it had an unmet peer.
- `@inflatable-cookie/poodle-svelte` moves from 0.4.2 to 0.4.4, so a consumer
  already on Poodle 0.4.4 resolves one Poodle copy instead of two.
- `marked` moves from 17.0.6 to 18.0.14, meeting Poodle's `marked ^18.0.9`
  peer. Markdown still passes through the same sanitizer before `{@html}`.
- `check:style-literals` is now `check:colour-literals`. Contributors run it by
  that name through `effigy health`; it still fails only on colour literals.

### Fixed

- The slash command palette renders as light editor chrome instead of a dark
  gradient over the shipped light defaults. Its search input and command labels
  were 1.00:1 and 1.23:1 against the composited background; they now resolve
  through the surface, field, border and text tokens. The multi-block item's
  danger state uses `--nightfire-color-danger` instead of three red literals.
- `effigy health` now runs `check:style-literals`, which fails on a colour
  literal in any `ts/src/**/*.svelte` style block.

## [0.2.0] - 2026-09-18

### Added

- Declared the core block vocabulary in `ts/src/core-blocks.ts`, with a test that
  holds each declared capability and its registration together.
- Core catalog self-registration through `./core-blocks`,
  `./editor-registrations`, and `./render-registrations`.
- Block renderers for `table` and `item_list`.
- The `rich_text` block: a renderer and an editor over Poodle's published,
  feature-gated rich-text surface, its empty checker, and the
  `data-nightfire-block="rich_text"` render hook. The block stores the
  ProseMirror document at `data.document` and enables Poodle's whole admitted
  feature set; the image node stays inert until a media source is registered.
- The `image` block: `{ media_id, alt?, title?, caption?, sizing? }` with a renderer, an editor and an
  empty checker, resolved through the media-source registry. `sizing` is `small | medium | large | full`
  and defaults to natural size; the renderer emits the preset as a data attribute and **no style at all**,
  so appearance stays the consumer's. The rich-text image command appears when a source is registered and
  is absent otherwise.
- The `video` block: `{ embed, title?, caption? }` over Poodle's own `ParsedEmbed`, with a renderer and an
  editor. No provider list, parser or embed shape is defined here, and rendered embed markup passes
  through `sanitizeEmbedHtml` before it reaches `{@html}`.
- Published JSON Schema documents under `schemas/`: `nightfire.value@1`, `nightfire.block@1`,
  `nightfire.registry@1`, `nightfire.strategy@1`, and one payload document per core block type. JSON
  Schema 2020-12, relative `$ref`s only, no consumer vocabulary, shipped in the package and required by the
  pack proof. `check:schemas` holds the set equal to the declared vocabulary and the shared wire fixtures.
- The table editor: a grid with a keyboard model, row and column insertion and removal, a row-level header
  toggle, per-cell alignment, per-edge borders, cell merge and split, and an in-page confirmation before a
  destructive action. `section` is not authored and round-trips unchanged.
- The `item_list` editor: items with an optional title and a body of child blocks, added, removed and
  reordered, with a child type rendering through the registry exactly as it does in the renderer. An item
  removal that would lose content asks first in-page, and `intro` and `variant` round-trip untouched.
- An optional `title` per file on `download_card`, beside the existing `description`.
- The `download_card` block: a renderer, an editor, and an empty checker over
  `{ description?, files: [{ media_id, title?, description? }] }`, with the
  `data-nightfire-block="download_card"` render hook. Rows resolve their
  reference through the media-source registry and render inert and marked when
  no source is registered or a reference is unknown; the card description and
  the author's file titles and descriptions survive.
- The Svelte-free media-source registry, exported as `./media-source`:
  `registerMediaSource({ pick, resolve })` with a synchronous `resolve`, plus
  `MediaKind`. Module-level rather than a Svelte context, so a renderer resolves
  too, and SSR-safe.
- The npm release automation: candidate identity manifest, archive verifier,
  static workflow guard, and OIDC release workflow. Candidate mode has run green;
  the publish half is unexercised until the next release.

### Removed

- **Breaking:** the `media` block type, its editor, its Svelte picker context
  (`createNightfireMediaContext` / `useNightfireMedia`), and the `./media`
  subpath. `MediaKind` moved to `./media-source`. `./media-locator` keeps its own
  subpath, so a consumer that imported locator helpers from `./media` moves them
  to `./media-locator`. There is no alias and no migration.

### Changed

- The exported surface replaces `./media` with `./media-source`; see Removed above.
- The editor default styling was audited: every token now has exactly one declared value with no
  inline `var()` fallback left, `--nightfire-color-focus` is declared (it was referenced and
  missing), and the `--nightfire-*` names are documented in `README.md` as the public override
  surface, with a wrapper-scoped recipe for aligning them to Poodle's variables.
- The `--nightfire-*` values in `ts/src/styles.css` are the editor surfaces' **default appearance layer**,
  and they are overridable defaults: the token **names** are the public API and the values are not. A
  consumer re-declares any of them in the scope that fits, including mapping them onto Poodle's semantic
  variables.

## [0.1.0] - 2026-09-18

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
