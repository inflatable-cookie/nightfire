# Core vocabulary and seams

The core package is the **authority** for the generic block vocabulary: its schemas, block
implementations, renderers, editors, validators, and the seams consumers hook into. It is not an
Acowtancy package. Profile blocks interleave with this vocabulary and are owned elsewhere.

## Ownership boundary

| Surface | Owner |
| --- | --- |
| Generic block vocabulary, their schemas and renderers | **this package** |
| Block id and version mechanics, registries, strategies | **this package** |
| The media reference format and the media-source registry | **this package** |
| The media library, and any picker or resolver implementation | the library owner |
| Profile block types and profile strategies | the profile owner |

Naming convention: generic types carry no prefix. Acowtancy profile types carry one —
`acow.*`, `content.*`, `widget*`. Note that `content.*` is the **selector** family (references into a
content library) and is not generic, which makes any generic type beginning `content` a naming hazard.

## The vocabulary

Seven generic blocks, in three generic categories: `Text`, `Layout` and `Media`. The remaining
categories in the registry are profile-owned.

| Type | Category | Role |
| --- | --- | --- |
| `markdown` | Text | plain markdown text |
| `rich_text` | Text | structured rich text, edited through the Poodle rich-text editor (TipTap/ProseMirror) |
| `table` | Layout | tabular structure, edited as a direct grid |
| `item_list` | Layout | ordered list of titled child-block items |
| `image` | Media | one image held as a media-library reference, with alt text and opt-in sizing |
| `video` | Media | an embed reference, authored through Poodle's embed input |
| `download_card` | Media | a card of downloadable files held in a media library |

Every type has an editor, a renderer and an empty checker. `ts/src/core-blocks.ts` declares the
vocabulary, and the self-registration test holds the declaration and the catalog registrations
together, so the package ships a working default catalog.

### `item_list`

Items are `{ title?, body }` where `body` carries **child Nightfire blocks**, so each item renders
through its own sub-interface and the block renders as an HTML list. The item body is deliberately
unconstrained to allow this, and the encoding convention already exists: a body is a `blocks` array
even when it holds a single block.

This shape was defined, not discovered: the extracted `content_list` was declared but nothing
constructed it, so there was no instance to preserve. The old name is retired because it collides with
the `content.*` selector family while being a `Layout` block.

### The three media blocks

The extracted `media` type was three different things wearing one name, and it is retired (operator
ruling, 2026-09-18). Each replacement says what it is:

- **`image`** is content in flow, and it holds a **library reference** so the file's URL, intrinsic
  size and title come from the source that owns them. It carries alt text and opt-in sizing.
- **`video`** is an embed. It carries Poodle's own `ParsedEmbed`, so provider parsing, previewing and
  rendering stay Poodle's, and it needs no library.
- **`download_card`** presents files the consumer manages, so it holds references and a resolver
  supplies the filename, size and URL. Each file carries an optional author-written title and an
  optional description, and the card itself carries an optional description. It is `image`'s sibling,
  not its replacement.

The library hooks apply to `image` and `download_card`; the embed does not. `media-locator` stays: it
locates a reference anywhere in a block value and is independent of the retired block.

## Block data shapes

The shape is pinned here so a worker implements a decision rather than inventing one. `item_list` is
`{ title?, intro?, variant?, items: [{ title?, body: <blocks> }] }`; `table` is
`{ caption?, rows: [{ section?, cells }] }` with cell markdown, header, span, alignment, and border
facts; and `rich_text` is `{ document: ProseMirrorDocumentJSON }` — one field, no envelope.

The table editor is a direct grid, not a structured field editor. Cell content stays markdown. Per-edge
borders are authored; column widths are not. The package has no undo, so destructive table actions
confirm in-page. Named row sections are not authored (see below). New rows omit `section`; the editor
round-trips a value it does not manage, and the published document permits either.

The media blocks are:

```
image         { media_id, alt?, title?, caption?, sizing? }
video         { embed: ParsedEmbed, title?, caption? }
download_card { description?, files: [{ media_id, title?, description? }] }
```

`image.sizing` is one of `small | medium | large | full`, absent meaning natural size. The renderer
emits the preset as `data-sizing` and no style at all; the consumer's stylesheet decides what each preset
means. A free-form width stays rejected because it puts an appearance value into content, and adding or
renaming a preset is a public API change. A media reference is never a URL: the source resolves it, so a
file moved or renamed in the library updates every block that shows it, and a block whose reference
cannot be resolved renders inert instead of breaking. The file name, size and URL of a download are
resolved the same way.

## Appearance

[Styling](../contracts/styling.md) owns the appearance rules: renderers carry no appearance, and the
editor stylesheet is an overridable default layer whose token names are public API. A block renderer
adds no token and takes no dependency on one.

## The rich-text vocabulary

The admitted vocabulary is not ours to invent: the Poodle rich-text engine assembles a **closed,
feature-gated** set, and a feature that is not selected contributes no nodes, marks, commands, input
rules or shortcuts. The feature vocabulary itself (`RichTextFeature`, `RichTextHeadingMode`) is
declared in Poodle core and validated there, so the `rich_text` block mirrors that set rather than
extending it.

| Group | Admitted |
| --- | --- |
| Always | document, paragraph, text, hard break, undo/redo |
| `formatting` | bold, italic, strike, code |
| `headings` | heading, bounded to the core-declared heading levels |
| `links` | link |
| `lists` | bullet list, ordered list, list item |
| `blockquote` | blockquote |
| `code-block` | code block |
| `horizontal-rule` | horizontal rule |
| `tables` | table, table row, table header, table cell |
| `images` | image, with `src`, `alt` and `title` as its whole model |

The image node's model is Poodle's and takes `src`, `alt` and `title`; the block's model is a
reference. Nightfire bridges the two: it supplies Poodle's host function from the registry, so
inserting an image in rich text picks a reference and resolves it to a URL. No source registered means
no insert command, which is Poodle's own behaviour.

## The media-source registry

Two block consumers — `image` and `download_card` — plus the image node inside `rich_text`. The old
plan named a media block third; that block is retired and its two jobs became `image` and
`download_card`, both of which sit on this one registry. `video` is not a consumer: an embed is
addressed by provider and id.

```
registerMediaSource({
  pick(options: { multiple: boolean, filterKind?: MediaKind }): Promise<MediaReference[] | null>,
  resolve(reference: MediaReference): ResolvedMedia | null
})
```

`ResolvedMedia` carries what its consumers need: `url` always, plus `filename` and `size` for a
download row, and `width`, `height` and `title` for an image. A consumer reads the fields it needs and
ignores the rest, so one source serves both.

Two constraints make it usable where it is needed:

- **Module-level, not a Svelte context.** A renderer must resolve references too, and a context
  provider is unreachable from a renderer.
- **`resolve` is synchronous.** A renderer renders synchronously and should work under SSR, so the
  consumer resolves over metadata it has already loaded. An unknown reference renders inert rather
  than suspending.

The block-scoped registration family (`registerBlockEditor`, `registerBlockRenderer`,
`registerBlockValidator`, `registerBlockEmptyChecker`, `registerBlockVersions`) is unchanged. This
registry sits beside it because its scope is a resource rather than a block, and a name in the
`registerBlock*` form would describe the wrong scope.

## Published schemas

This package publishes the JSON Schema documents for its own mechanics and for the block payloads it
owns. The requirement is the consumer's, measured on the Acowtancy tree and delivered by the
Market/Silo Chatterbox consultation of 2026-09-18.

**Published:** the value envelope mechanics, the block wrapper, registry mechanics, strategy mechanics,
and a payload document for every core block type. JSON Schema 2020-12, stable file names, and relative
`$ref`s only — a consumer copies the bytes into an offline-resolvable tree and will not resolve a
network `$ref`.

**Consumption:** the consumer copies the bytes from the tagged release at build time into an
offline-resolvable tree, proves digest equality with the tagged files, and `$ref`s ours by relative
path. No runtime import and no live `$id` fetch. Mirrors key files and relative `$ref`s, not `$id`s, so
file names and tree layout are stable API. The schemas must be in the tagged release before the consumer
repins. Documents are hand-authored and verified, not generated: generating them would need a new
dependency, and the verification is what the consumer asked for.

**Not published:** product strategy schemas, question or answer payloads, widget vocabulary,
spreadsheet core, field profiles, document kinds, or publishing enums. Those stay with the consumer,
whose strategy documents `allOf` our envelope and then pin their own `schema` const.

**Identifiers:** `nightfire.value@1`, `nightfire.block@1`, `nightfire.registry@1`,
`nightfire.strategy@1`. No `acow:` or `silo.` string appears in one, and the consumer's own enum must
not appear anywhere in the published tree. The wire `schema` field on a value **stays the consumer's**,
because it names their strategy: the envelope types it as a string or an open pattern rather than an
enum. Strategy mechanics describe shape and must not list consumer strategy ids.

**Proof:** the documents are verified rather than asserted. Every declared core block has a payload
document, the shared `core-payloads` fixture case carries one representative stored payload per type,
positive fixtures validate and negative fixtures are rejected, the Rust implementation round-trips the
same shared wire fixtures, and the pack proof requires the files. Publishing shapes that nothing
verifies is the specific failure the consumer said it will not consume.

**The published set is coupled to the declaration, deliberately.** `ts/scripts/check-schemas.ts` asserts
exact set equality between the payload documents under `schemas/blocks/` and `CORE_BLOCK_TYPE_NAMES`, and
it runs in `health`. So:

- declaring a new core block type requires its payload document, its `core-payloads` fixture case,
**and** an editor authoring test **in the same change**, or `qa` fails;
- changing a block's payload shape requires the matching document and representative payload in the same
commit, because the published document is what the consumer byte-pins;
- removing the document for a type without removing the type fails the same way.

Each `core-payloads` entry is the data the editor stores when its optional fields are filled
(download-card file titles, image sizing, table cell spans and borders, round-tripped `item_list`
`intro`/`variant`, a table `section` the editor does not author). The check validates that payload,
rejects an unknown-property counterexample, and requires the representative to carry every property the
document declares, including nested objects that are not a recursive `$defs` node. A document property
the representative omits, or a representative field the document lacks, fails `health`. Do not weaken
the set-equality check to ease a change; update the document in the same change instead. Documents stay
hand-authored.

**Editor output:** a component test authors each core block through its editor, filling the optional
fields the UI exposes, then validates the stored payload with the same JSON Schema machinery
`check:schemas` uses and checks that every stored key is present on that type's `core-payloads`
representative, nested included. An editor that starts writing a field the document or representative
lacks fails `qa`.

`rich_text` does not compare ProseMirror node keys against the representative. The tree's keys depend
on which nodes the author used, so the test validates the stored document against the published
recursive node schema (`additionalProperties: false`) and checks only the payload's own keys
(`document`) against the representative.

Fields the editor does not author (`table` row `section`, `item_list` `intro` and `variant`) stay on
the representative and the document. Round-trip tests and the document-coverage check prove them; the
authoring path does not.

## Named row sections

Deferred, with a trigger. `table` rows may carry a `section` string and the renderer emits it as
`data-section` on the `<thead>` or `<tbody>` group, but nothing authors one: new rows omit it, the
editor only round-trips a value it does not manage, and no consumer is known to target the attribute. Add
an authoring control when a consumer needs to target a row group, as its own change. It is not a per-row
text box: sections define groups, and the renderer groups **consecutive** rows, so the design must
answer how a row joins a group, what happens to a group when a row is reordered out of it, and whether a
header row can sit inside a named group. The renderer's group key (`section + rows.length`) collides for
two same-named groups of equal length, which would need fixing before sections became authorable.

## Consequences

Profile blocks interleave with this vocabulary rather than wrapping it. The consumer-facing
artefact is one manifest published from the profile side, carrying both the core vocabulary and the
profile's own blocks.
