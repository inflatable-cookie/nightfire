# g01.012 Image Block

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`, `docs/contracts/003-styling-and-restyling.md`
Depends on: g01.008 — it consumes the media-source registry that lane creates
UI classification: refinement — compact brief below
Ready state: ready — sizing presets settled by the operator on 2026-09-18

## Outcome

`image` is usable: one image held as a media-library reference, with alt text, an optional title and
caption, and opt-in sizing. It resolves through the same registry the download card uses.

## Context

The image is content in flow, and its file facts belong to the library that owns them. Holding a
reference rather than a URL means a file moved or renamed in the library updates every block showing
it, and a reference that cannot be resolved renders inert instead of breaking the page.

The reference field is `media_id`, following the retired `media` block rather than adding a second
spelling for the same slot. The extracted `media` editor's `display` field — inline, block, float-left,
thumbnail — was image presentation and is dropped: floats do not survive contact with modern layout,
and inline-versus-block is the surrounding layout block's decision.

`rich_text` is implemented (g01.007) with the image feature admitted. Poodle's image node takes
`src`, `alt` and `title`, so this lane bridges the two: Nightfire supplies Poodle's host function from
the registry, and the insert command appears exactly when a source is registered.

## Decisions

- **Block data.** `{ media_id, alt?, title?, caption?, sizing? }`. The block owns what the author
  decides; the library owns the URL, filename and intrinsic dimensions.
- **One registry, extended not forked.** g01.008 builds `registerMediaSource` for the download card.
  This lane extends it additively: `pick` gains an optional `filterKind`, and `ResolvedMedia` gains
  `width`, `height` and `title` if the earlier lane did not already provide them. If g01.008 already
  returns those fields, change nothing there.
- **`sizing` is absent by default** and means natural size. The renderer emits the preset as a
  `data-sizing` attribute and **no style at all**: contract 003 rule 4 makes appearance entirely the
  consumer's, so what `medium` means is the consumer's stylesheet. The consequence is deliberate —
  without a consumer stylesheet an image renders at its natural size and can overflow its column,
  which is the consumer's call rather than a hidden default.
- **Presets, not widths.** `sizing` is `"small" | "medium" | "large" | "full"`, there is no default
  value in the data, and the renderer emits the preset as a data attribute so that no appearance value
  enters the block or the renderer. Adding or renaming a preset is a public API change. A free-form
  width is rejected: contract 003 keeps appearance with the consumer, and content authored at a fixed
  pixel width cannot respond to a narrow column.
- **Intrinsic dimensions are used, not stored.** When the source resolves `width` and `height`, the
  renderer emits them so the page does not shift while the image loads. A source that does not provide
  them simply renders without them.
- **The rich-text host function comes from the registry**, not from a consumer prop: pick an image
  reference, resolve it, and return `{ src, alt, title }` to Poodle. With no source registered the
  command is absent, which is Poodle's own behaviour.
- **Alt text matters.** The editor surfaces it next to the picker rather than behind a disclosure. The
  data still allows it to be absent, and the renderer emits exactly what it is given.

## UI design brief (compact)

- **Classification and workflow:** refinement. The author picks an image from the library, then writes
  alt text, an optional title and caption, and optionally a size. The picker pattern is the one the
  download card already established.
- **Presentation direction:** semantic markup, `data-nightfire-block="image"`, and the preset as a
  `data-sizing` attribute. No scoped styles, no class of our own, and no style emitted at all.
- **States:** no `media_id` → nothing rendered; a reference with no registered source, or one the
  source cannot resolve → inert and marked by a data attribute; resolved → the image renders, with
  intrinsic dimensions when the source provides them; sizing absent → natural.
- **Scenario oracle:** register a source, pick an image, add alt text and `sizing="medium"`, save,
  reload, and confirm the reference round-trips and the renderer emits the `data-sizing` attribute. Then unregister the source and confirm the block renders inert rather than
  breaking. Then open the rich-text editor and confirm the image command is present with a source and
  absent without one.

## Work

1. Add the `image` renderer and editor; register both from the catalog files and declare their
   side-effect modules.
2. Flip the `image` capability flags in `ts/src/core-blocks.ts` in the same change.
3. Extend the registry additively as described above, and prove the download card still works.
4. Record the preset names and the `data-sizing` attribute in the block's renderer. Do not add a token,
   a stylesheet rule or an inline style for them; what a preset means is the consumer's decision.
5. Supply Poodle's `requestImage` from the registry inside the `rich_text` block editor.
6. Prove the declaration holds, and prove the renderer resolves without an editor module.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| One registry, two blocks | the image invents a second picker or resolver | both blocks import the same module; no test registers two sources |
| A URL is never stored | the editor writes a resolved URL into `data` | `data` round-trips `media_id` only, and no `src` appears in block data |
| One registry extension, not a rewrite | the image lane forks or renames the registry contract | the download card's tests still pass unchanged, and the added fields are optional |
| No appearance value in data | a pixel or percentage width is stored | `sizing` is one of the closed preset names, and unknown values degrade to natural |
| Sizing carries no style | the renderer emits a width, a token value, or an inline style | a component test asserts the rendered image element carries no `style` attribute and that the preset appears only as `data-sizing` |
| Inert, never broken | an unresolved reference throws or is hidden | a test renders an unresolved reference and asserts marked, inert output |
| Rich text inserts an image | the command appears with no source registered | the command is absent with no source, and inserts the resolved `src`, `alt`, `title` with one |
| The render path stays editor-free | the renderer picks up an editor module | `effigy check:boundaries` passes |
| Restyleability holds | a scoped style, a new class, or an unjustified token | contract 003 rules 1–4 |

## Stop conditions

Stop and report if the registry cannot serve both blocks without a second registration, if a resolved
reference cannot be read synchronously, or if Poodle's image node cannot be driven from the registry.
Do not add a width in pixels, do not store a URL in block data, and do not vendor an image picker.

## Evidence

On completion, record: the registered parts, the registry extension, the preset names and the
`data-sizing` attribute, the intrinsic-dimension behaviour, the host-function path into rich text, the
component tests, and the exact `effigy qa` result.
