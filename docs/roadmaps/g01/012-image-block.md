# g01.012 Image Block

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`, `docs/contracts/003-styling-and-restyling.md`
Depends on: g01.008 — same declaration and catalog files
UI classification: refinement — compact brief below
Ready state: not ready — the sizing preset names await operator confirmation

## Outcome

`image` is usable: one image addressed by URL, with alt text, an optional title and caption, and
opt-in sizing. It references no media library and resolves nothing.

## Context

Poodle's rich-text image node model is `src`, `alt`, `title`. Mirroring it keeps one mental model
across the block and the editor, and it is why this block needs no reference and no registry.

The extracted `media` editor carried `display` with the values inline, block, float-left and
thumbnail. That is image presentation, and floats are dropped: they do not survive contact with
modern layout, and inline-versus-block is the surrounding layout block's decision.

`rich_text` is implemented (g01.007) with the image feature admitted, so its insert command stays
unavailable until a host function exists. This lane supplies that function.

## Decisions

- **Block data.** `{ src, alt?, title?, caption?, sizing? }`.
- **`sizing` is absent by default** and means natural size. The renderer always emits
  `max-inline-size: 100%`, so no image can overflow its column whatever the preset says.
- **Presets, not widths.** Each preset maps to a token-backed maximum inline size, so no appearance
  value enters the block's data. A free-form width is rejected: contract 003 keeps appearance with the
  consumer, and content authored at a fixed pixel width cannot respond to a narrow column.
  **Open: the preset names.** The recommendation is `small | medium | large | full`.
- **The rich-text host function.** A consumer-supplied
  `requestImage() => Promise<{ src, alt, title } | null>`, forwarded as a prop from `NightfireEditor`
  to the `rich_text` block editor. No global registration, no library, and Poodle omits the insert
  command while no function is present.
- **Alt text matters.** The editor surfaces it next to the URL rather than behind a disclosure; the
  data still allows it to be absent, and the renderer emits exactly what it is given.

## UI design brief (compact)

- **Classification and workflow:** refinement. The author supplies a URL, then alt text, an optional
  title and caption, and optionally a size. The image block is new, but it adds no new interaction
  pattern beyond the field editors already in use.
- **Presentation direction:** semantic markup, `data-nightfire-block="image"`, the sizing preset as a
  data attribute, and the token property on the root. No scoped styles, no class of our own.
- **States:** no `src` → nothing rendered; `src` present → the image renders whether or not it loads,
  and the consumer's CSS decides broken-image treatment; sizing absent → natural; sizing present → the
  preset applies.
- **Scenario oracle:** author an image with alt text and `sizing="medium"`, save, reload, and confirm
  the data round-trips unchanged and the renderer emits the token property plus the sizing data
  attribute. Then load the rich-text editor with a host function registered and confirm the image
  command appears; remove the function and confirm it is absent.

## Work

1. Add the `image` renderer and editor; register both from the catalog files and declare their
   side-effect modules.
2. Flip the `image` capability flags in `ts/src/core-blocks.ts` in the same change.
3. Add the sizing preset names to the renderer's token surface, and record that adding or renaming a
   preset is a public API change.
4. Forward `requestImage` from the editor entry point to the `rich_text` block editor.
5. Prove the declaration holds, and prove the renderer adds no token of its own beyond the sizing
   property.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| No library reference | the image resolves a reference or needs a registered source | the block renders from `src` alone; no test registers a media source |
| No appearance value in data | a pixel or percentage width is stored | `sizing` is one of the closed preset names, and unknown values degrade to natural |
| Sizing is token-backed | the renderer carries a literal width | the renderer emits the token property; the value lives in the token layer |
| The render path stays editor-free | the renderer picks up an editor module | `effigy check:boundaries` passes |
| Rich text inserts an image | the command is available with no host function | with no `requestImage` the command is absent; with one it inserts `src`, `alt`, `title` |
| Restyleability holds | a scoped style, a new class, or an unjustified token | contract 003 rules 1–4 |

## Stop conditions

Stop and report if the sizing presets are still unconfirmed, if Poodle's image node cannot accept a
consumer-supplied host function, or if the renderer needs a library reference to show anything. Do not
add a width in pixels, and do not vendor an image picker.

## Evidence

On completion, record: the registered parts, the preset names and their token names, the host-function
prop path, the component tests, and the exact `effigy qa` result.
