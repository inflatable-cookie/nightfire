# Package boundary

The public package and its retained dependency graph.

## Ownership

Nightfire owns generic Rust and TypeScript/Svelte block values, normalization,
validation, strategies, registries, version coercion, hashing, block IDs, media
locators, rendering, editing, and markdown behavior. Consumers own product
schemas, product blocks, registrations, persistence policy, authorization,
media traversal integrations, HTTP adaptation, and application services.

The authoritative Rust crate is `nightfire`. Underlay's historical
`underlay-nightfire` crate may survive only as a temporary re-export facade
after consumer migration begins.

## Public surface

- Expose the Rust crate through the root Cargo workspace and the npm package
  through the root `package.json`, from one immutable repository version.
- Keep implementation in explicit `rust/` and `ts/` tranches with shared root
  wire fixtures.
- Export one explicit entry point per job, and no subpath for a module that is
  only an internal seam:

  | Subpath | Job |
  | --- | --- |
  | `.` | Svelte-free aggregate: block IDs, versions, media locators, types, registries, validation |
  | `./core` | Svelte-free durable value mechanics |
  | `./validation` | Save-boundary validation, FormData writer |
  | `./types`, `./utils`, `./block-versions` | Narrow type and normalisation modules |
  | `./editor-registry`, `./render-registry`, `./validator-registry` | Registry mechanics with registration, unregistration and clear seams |
  | `./editor`, `./editor-registrations` | Editor surfaces and their registration effect |
  | `./renderer`, `./render-registrations`, `./rich-text`, `./markdown` | Render surfaces and their registration effect |
  | `./strategies`, `./media-source`, `./styles.css`, `./package.json` | Strategies loading, media resolution seam, editor appearance, manifest |

- Keep `.` light and Svelte-free. A root import may not reach `./strategies` or
  a `.svelte` module: `strategies` imports Svelte stores at runtime and is a
  browser-only subpath.
- Export `renderSafeMarkdownPreview` from `./markdown`, the surface that already
  owns markdown rendering.
- Do not export `block-ids` and `media-locator` as extra subpaths: `./core`,
  `./validation` and `.` already answer them.
- `./rich-text` is the stored rich-text path: the sanitized document renderer
  and the schema-scoped inline-node renderer registry. It is a renderer entry
  point, so it loads no editor, no registration effect, and no Poodle. Consumer
  inline-node registrations are render-time only: schema scoped, composed into
  the document, and sanitized with it. They change no wire shape, no block
  schema and no editor vocabulary
  ([vocabulary](../domain/vocabulary.md#consumer-inline-nodes)).
- Keep `core` and `validation` free of Svelte runtime imports.
- Allow registry modules to import Svelte types only.
- Keep renderer imports free of editor modules, registration effects, and
  runtime Poodle imports. Type-only Poodle imports pass.
- Keep `@inflatable-cookie/poodle-svelte` an optional peer of editor entry
  points only. Declare it as a patch range within one Poodle minor
  (`>=0.4.4 <0.5` today), not an exact version: below `1.0` a Poodle minor is
  breaking and moves the range in a Nightfire release, while a Poodle patch
  needs none (Tom, 2026-09-27).
- Keep editor and renderer registration as explicit consumer opt-ins.
- Every registry exposes `unregister` and `clear` next to its `register`. A
  process-global registry must be retirable, or tests and hot reloads leak one
  case's registrations into the next. A schema-scoped registry resolves the
  schema before the `*` wildcard.
- Side effects are declared by file shape, not by an enumerated list:
  `**/editor.ts`, `**/render.ts`, `**/*-registrations.ts` and `**/*.css` are the
  side-effect modules. Adding a block must not require editing that list.

## Data and trust

- Reject unknown block versions and legacy sibling `block` envelopes, including
  a hybrid value that carries both `block` and `blocks`.
- Reject a value with no schema. A block with no schema has no validated home.
- Do not invent migrations during normalization.
- A non-object is not an empty block. Coercion returns `null` rather than
  fabricating one, and a block re-typed to the default type drops the data and
  version that belonged to the type it was not.
- Assign missing `nf_` block IDs during save preparation.
- Treat markdown and embedded HTML as untrusted.
- Sanitize before every Svelte `{@html}` path in browser, SSR, and desktop
  WebView-shaped execution.

## Media locators

A locator is `<block-id>#<json-pointer>`, with the pointer relative to the
block's `data`. The TypeScript and Rust implementations agree on every rule:

- The pointer is a non-empty RFC 6901 pointer: slash-prefixed, with every `~`
  escaping `0` or `1`.
- A block ID never contains `#`; the separator is the one `#`.
- An array segment is `0` or a digit string without a leading zero.
- A segment resolves only an own property, so `#/constructor` resolves nothing.
- Resolution finds the block by ID among top-level blocks and then inside
  another block's data, so a nested `item_list` body resolves too.

## Dependencies

Every runtime dependency needs direct retained-source evidence, recorded in
`PROVENANCE.md` and the package documentation. Forbidden Underlay, framework,
product, and duplicate utility dependencies stay absent from both manifests,
locks, and source graphs. `@inflatable-cookie/poodle-svelte` is an optional
peer for editors; renderer graphs must not reach it at runtime.

## Proof

The package boundary is not established by prose alone. Cargo format/check/
clippy/test/package, npm export/source-graph/bundle/pack, wire, sanitization,
component, type, version-sync, and clean Git-consumer checks must remain
executable through Effigy.
