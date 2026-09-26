# Changelog

All notable Nightfire changes are recorded here. Nightfire follows Semantic
Versioning. `0.1.0` is published on npm and tagged `v0.1.0`; that identity is
immutable.

## [Unreleased]

### Added

- `--nightfire-color-selection`, the slash palette's selected-item colour, so the
  highlight is a named token rather than two literal alphas.

### Changed

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
