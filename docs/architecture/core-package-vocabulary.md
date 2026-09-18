# Core package vocabulary and seams

## What this decides

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

| Type | Category | Role | State |
| --- | --- | --- | --- |
| `markdown` | Text | plain markdown text | implemented: editor and renderer |
| `rich_text` | Text | structured rich text, edited through the Poodle rich-text editor (TipTap/ProseMirror) | implemented: editor and renderer |
| `table` | Layout | tabular structure | renderer implemented; editor to add |
| `item_list` | Layout | ordered list of titled child-block items | renderer implemented; editor to add; renamed from `content_list`, with no live instances |
| `image` | Media | one image held as a media-library reference, with alt text and opt-in sizing | to add |
| `video` | Media | an embed reference, authored through Poodle's embed input | to add |
| `download_card` | Media | a card of downloadable files held in a media library, each with an optional description | to add |

`ts/src/core-blocks.ts` still declares `media` until the download-card lane lands. The table above is
the target vocabulary and the declaration follows it; after that lane there is no `media` type, no
`./media` subpath, and no Svelte picker context.

### `item_list`

Items are `{ title?, body }` where `body` carries **child Nightfire blocks**, so each item renders
through its own sub-interface and the block renders as an HTML list. The item body is deliberately
unconstrained to allow this, and the encoding convention already exists: a body is a `blocks` array
even when it holds a single block.

The previous name `content_list` is retired. It collides with the `content.*` selector family while
being a `Layout` block, and the collision misleads in exactly the direction that is expensive to
unpick.

### The three media blocks

The old `media` type was three different things wearing one name, and it is retired. Each replacement
now says what it is:

- **`image`** is content in flow, and it holds a **library reference** so the file's URL, intrinsic
  size and title come from the source that owns them. It carries alt text and opt-in sizing.
- **`video`** is an embed. It carries Poodle's own `ParsedEmbed`, so provider parsing, previewing and
  rendering stay Poodle's, and it needs no library.
- **`download_card`** presents files the consumer manages, so it holds references and a resolver
  supplies the filename, size and URL. Each file carries an optional author-written title and an
  optional description, and the card itself carries an optional description. It is `image`'s sibling,
  not its replacement.

## Block data shapes

The shape is pinned here so a worker implements a decision rather than inventing one. `item_list` is
`{ title?, intro?, variant?, items: [{ title?, body: <blocks> }] }`; `table` is
`{ caption?, rows: [{ section, cells }] }` with cell markdown, header, span, alignment, and border
facts; and `rich_text` is `{ document: ProseMirrorDocumentJSON }` — one field, no envelope.

The media blocks are:

```
image         { media_id, alt?, title?, caption?, sizing? }
video         { embed: ParsedEmbed, title?, caption? }
download_card { description?, files: [{ media_id, title?, description? }] }
```

`image.sizing` is absent by default. A media reference is never a URL: the source resolves it, so a
file moved or renamed in the library updates every block that shows it, and a block whose reference
cannot be resolved renders inert instead of breaking. The file name, size and URL of a download are
resolved the same way.

## Appearance

[Contract 003](../contracts/003-styling-and-restyling.md) owns the renderer appearance rules:
renderers carry no scoped styles, emit `data-nightfire-block="<type>"`, introduce no class of their
own, and leave appearance entirely to the consumer. Data attributes carry structural facts, and a
content-presentational fact belongs to the block's data rather than to a theme. The retained
`underlay-*` class selectors are extraction artifacts — `PROVENANCE.md` is explicit that they are not
an import, dependency, or integration hook — and no renderer may depend on them.

`ts/src/styles.css` and its 23 `--nightfire-*` values are the **editor surfaces' default appearance
layer**: every token is consumed, and only by editor chrome — no renderer references one. Its
`./styles.css` subpath therefore stays. What is open in
[g01.011](../roadmaps/g01/011-editor-default-styling.md) is where those **values** come from, because
`PROVENANCE.md` traces them to an application stylesheet and several inline fallbacks contradict the
shipped palette. A block renderer still adds no token and takes no dependency on one.

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

## Identity

Core schemas must carry **this package's** identifiers and be generated and published here. They
currently carry an Acowtancy-local identifier and are generated by a crate in another repository,
which puts a consumer's namespace on the core's own shapes. Correcting that is part of being the
authority rather than a mirror of one.

## Open items

1. **`item_list` nesting** — settled on the evidence: **define it as a container of child blocks.**
   There is no instance to confirm against, because nothing produces one. The type is declared and
   granted (`ContentListBlock` with `body: Value`, whitelisted into the rich-text and rubric
   strategies) but **no code constructs it, no library holds one, and no legacy block maps to it** —
   so the corpus contains no instance, no producer and no origin. The shape is therefore ours to
   define, and the more capable definition costs nothing because nothing depends on the current one.
   That also makes the rename free: there are no instances to migrate.
2. **Rich text vocabulary** — settled above, pinned from the editor's feature-gated extension set. The
   document lives at `data.document`; the image insert path is supplied from the media-source registry.
3. **Media block count** — settled: **three**, because the old `media` shell was an image, an embed
   and a download card wearing one name. `image` and `download_card` hold library references and render
   through the registry; `video` is a Poodle embed and does not.
4. **Self-registration** — the package ships the mechanism but no default catalog. A complete core
   registers its own vocabulary so a consumer gets working blocks without composing them.
5. **`image.sizing` representation** — settled: `"small" | "medium" | "large" | "full"`, absent for
   natural size. The renderer emits the preset as a **data attribute and nothing else**; the consumer's
   own stylesheet decides what each preset means, which is what contract 003 rule 4 requires. A
   free-form width stays rejected: it puts an appearance value into content. Adding or renaming a preset
   is a public API change.
6. **`download_card` per-file titles** — decided after g01.008 was dispatched on a pinned handoff, so
   its PR carries `{ media_id, description? }` only. [g01.014](../roadmaps/g01/014-download-card-file-titles.md)
   adds `title?`, and it can run in parallel with the image lane because it touches no shared file.
7. **Retiring `media`** — settled: the type, its editor, its Svelte picker context, and the published
   `./media` subpath go together. `media-locator` stays: it locates a reference anywhere in a block
   value and is independent of the retired block.
8. **Schema identity** — the identifiers and generation home are decided in
   [g01.010](../roadmaps/g01/010-core-schema-identity.md), which is blocked across repositories.
9. **Named row sections** — **deferred, with a trigger.** `table` rows carry a `section` string and the
   renderer emits it as `data-section` on the `<thead>` or `<tbody>` group, but nothing anywhere authors
   one: there is no instance in the tests, the fixtures, the Rust crate or the docs, and no consumer is
   known to target the attribute. The editor does not author it and must round-trip a value it does not
   manage, so nothing is lost by waiting. Add an authoring control when a consumer needs to target a
   row group — styling or behaviour keyed on `data-section` — and design it as its own lane. It is not
   a per-row text box: sections define groups, and the renderer groups **consecutive** rows, so the
   lane must answer how a row joins a group, what happens to a group when a row is reordered out of
   it, and whether a header row can sit inside a named group. The renderer's group key
   (`section + rows.length`) also collides for two same-named groups of equal length, which suggests
   the path has never been exercised and would need fixing before it became authorable.

## Consequences

Profile blocks interleave with this vocabulary rather than wrapping it. The consumer-facing
artefact is one manifest published from the profile side, carrying both the core vocabulary and the
profile's own blocks.
