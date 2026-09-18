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
| The media reference format and the media-source seam | **this package** |
| The media library, and any picker or resolver implementation | the library owner |
| Profile block types and profile strategies | the profile owner |

Naming convention: generic types carry no prefix. Acowtancy profile types carry one —
`acow.*`, `content.*`, `widget*`. Note that `content.*` is the **selector** family (references into a
content library) and is not generic, which makes any generic type beginning `content` a naming hazard.

## The vocabulary

Six generic blocks, in four categories. `Text`, `Layout` and `Media` are generic; the remaining
categories in the registry are profile-owned.

| Type | Category | Role | State |
| --- | --- | --- | --- |
| `markdown` | Text | plain markdown text | implemented: editor and renderer |
| `rich_text` | Text | structured rich text, edited through the Poodle rich-text editor (TipTap/ProseMirror) | vocabulary and data shape pinned below; renderer and editor to add |
| `table` | Layout | tabular structure | renderer implemented; editor to add |
| `item_list` | Layout | ordered list of titled child-block items | renderer implemented; editor to add; renamed from `content_list`, with no live instances |
| `image` | Media | light shell referencing a media item, with alt text and sizing | to add |
| `media` | Media | light shell linking to a media item, rendered as a download card | editor and empty checker implemented; renderer to add |

### `item_list`

Items are `{ title?, body }` where `body` carries **child Nightfire blocks**, so each item renders
through its own sub-interface and the block renders as an HTML list. The item body is deliberately
unconstrained to allow this, and the encoding convention already exists: a body is a `blocks` array
even when it holds a single block.

The previous name `content_list` is retired. It collides with the `content.*` selector family while
being a `Layout` block, and the collision misleads in exactly the direction that is expensive to
unpick.

### `image` and `media` are shells

Both carry an opaque reference and presentation metadata, and nothing about where the bytes come
from:

```
{ media_id: <opaque reference>, alt?, caption?, sizing? }
```

The core defines the reference slot. It does not define a library, a storage shape, or a URL form.
A consumer without a registered media source still has a valid block that renders inert. The slot is
spelled `media_id` everywhere, following the existing media block rather than adding a second name for
the same reference.

## Block data shapes

The shape is pinned here so a worker implements a decision rather than inventing one. `item_list` is
`{ title?, intro?, variant?, items: [{ title?, body: <blocks> }] }`; `table` is
`{ caption?, rows: [{ section, cells }] }` with cell markdown, header, span, alignment, and border
facts; `media` is `{ media_id, caption?, alt?, display? }`, matching the editor that already exists;
and `rich_text` is `{ document: ProseMirrorDocumentJSON }` — one field, no envelope.

`image` is `{ media_id, alt?, caption?, sizing? }`. Whether `media` keeps its `alt` and `display`
fields or the clean break moves alt and sizing to `image` only is **open**; see the open items below.

## Appearance

[Contract 003](../contracts/003-styling-and-restyling.md) owns the renderer appearance rules:
renderers carry no scoped styles, emit `data-nightfire-block="<type>"`, introduce no class of their
own, and leave appearance entirely to the consumer. Data attributes carry structural facts, and a
content-presentational fact belongs to the block's data rather than to a theme. The retained
`underlay-*` class selectors are extraction artifacts — `PROVENANCE.md` is explicit that they are not
an import, dependency, or integration hook — and no renderer may depend on them.

`ts/src/styles.css` and its 23 `--nightfire-*` values are an **application interface** swept in by the
extraction, not a content concern: six of the tokens are UI-shaped — button chip padding, field
background, danger, and surface colours — and no markdown, table, or list renderer needs any of them.
Where that interface styling belongs is open and is
[g01.011](../roadmaps/g01/011-application-interface-styling.md). Until it is settled, a block renderer
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

The image node is the extension point: Poodle extends it to keep that public model closed, and the
consumer supplies the `src`. That is the read path of the media-source seam below, and it is why the
seam cannot be block-scoped.

## Image and media are two types

They differ in admin and in renderer, so they are separate blocks rather than one with a kind.

- **`image`** carries alt text and sizing, because an image is content a reader must be able to
  interpret and a layout must be able to place. Poodle's image node independently admits `alt` and
  `title`, which corroborates that alt belongs in the image model rather than beside it.
- **`media`** is a generalised linkage: a reference plus whatever a **download card** needs to
  present it. No alt text, no sizing, because it is not rendered as content in flow.

## The media-source seam

One seam, three consumers: the `image` block, the `media` block, and the image node **inside**
`rich_text` — the rich-text editor carries an image extension that it leaves for consumers to
implement.

Because rich text consumes it, **the seam is not block-scoped**. It registers a source for media
references, with two capabilities because the read and write paths differ:

```
registerMediaSource({ pick, resolve })

pick(reference?) -> opaque reference     // creation: open a chooser, return a reference
resolve(reference) -> renderable source  // reading: turn a reference into something renderable
```

The block-scoped registration family (`registerBlockEditor`, `registerBlockRenderer`,
`registerBlockValidator`, `registerBlockEmptyChecker`, `registerBlockVersions`) is unchanged. This
seam sits beside it because its scope is a resource rather than a block, and a name in the
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
2. **Rich text vocabulary** — settled above, pinned from the editor's feature-gated extension set.
   Rich text can hold an image node, which is why the media-source seam must reach it. The document
   lives at `data.document`.
3. **Two media types or one** — settled: **two**, because they differ in admin and renderer. `image`
   carries alt text and sizing; `media` is a generalised linkage rendered as a download card.
4. **Self-registration** — the package ships the mechanism but no default catalog. A complete core
   registers its own vocabulary so a consumer gets working blocks without composing them.
5. **`media` alt and display fields** — **open**. The existing `media` editor reads `alt` and
   `display`; the vocabulary above gives alt and sizing to `image` and a download card to `media`.
   Either `media` keeps those fields or the clean break moves them to `image` only. Decide before
   [g01.008](../roadmaps/g01/008-media-source-seam-and-shells.md) is dispatched.
6. **Schema identity** — the identifiers and generation home are decided in
   [g01.010](../roadmaps/g01/010-core-schema-identity.md), which is blocked across repositories.

## Consequences

Profile blocks interleave with this vocabulary rather than wrapping it. The consumer-facing
artefact is one manifest published from the profile side, carrying both the core vocabulary and the
profile's own blocks.
