# g01.007 Rich-Text Block

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`,
`docs/contracts/003-styling-and-restyling.md`
Depends on: no other Queue task
UI classification: none — component wiring; the editing experience is Poodle's
and appearance is limited to the no-scoped-styles, data-hook rule

## Outcome

The declared `rich_text` core block becomes usable: a registered renderer and a
registered editor over Poodle's feature-gated rich-text surface, with the
document stored in the block's own data.

## Context

Poodle publishes the whole surface at
`@inflatable-cookie/poodle-svelte/rich-text`: `RichTextEditor`,
`RichTextRenderer`, the closed `RICH_TEXT_FEATURES` set, the heading levels, and
the shared command registry. Nightfire re-implements none of it. It wraps the two
components and pins the admitted set that
`docs/architecture/core-package-vocabulary.md` already declares.

No `rich_text` block instance exists in this repository, in Underlay, or in the
Acowtancy product corpus — `acow:content/rich_text` there is a field **strategy**,
not a block. The data shape is therefore ours to define rather than recover.

## Decisions

- **Data shape.** The ProseMirror document lives at `data.document`, typed
  `ProseMirrorDocumentJSON`. One field, no envelope.
- **Admitted features.** The block enables the whole admitted set
  (`RICH_TEXT_FEATURES`), images included. Poodle omits the image-insert command
  while no `requestImage` host function is present, so an unwired image node is
  inert rather than an error. [g01.008](008-media-source-seam-and-shells.md)
  supplies the host function.
- **Empty content.** `data.document` is empty when it is absent, is not an
  object, or is a document with no text and no non-text node.
- **Appearance.** A renderer carries no scoped styles, emits
  `data-nightfire-block="rich_text"` on its root, and introduces no class of its
  own. Structural facts go in data attributes. This package adds no token: the
  `--nightfire-*` set is an application interface, not a content concern, and its
  ownership is open in [g01.011](011-application-interface-styling.md).
- **Version.** Initial version for a new type. No migration, and unknown
  versions stay rejected.

## Work

1. Add `ts/src/rich-text/` with `RichTextRenderer.svelte` and
   `RichTextEditor.svelte` wrapping Poodle's two components.
2. Register the renderer from `ts/src/rich-text/render.ts` and the editor plus
   empty checker from `ts/src/rich-text/editor.ts`; import both from the existing
   catalog files.
3. Flip the `rich_text` capability flags in `ts/src/core-blocks.ts` in the same
   change that registers each part.
4. Declare the two side-effect modules in `package.json` `sideEffects`.
5. Prove the declaration holds through the existing self-registration test, with
   no test-side special case for this type.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| Declaration and registration agree | `rich_text` flags are true and nothing is registered | `ts/tests/nightfire/core-self-registration.test.ts` passes |
| The vocabulary is Poodle's, not a second copy | a local feature list, node schema, or toolbar definition appears | no rich-text node, mark, feature, or toolbar definition exists under `ts/src`; the feature list is Poodle's exported set |
| The renderer renders structured content | it falls back to raw text or unsanitised HTML | a component test renders a document with a heading, a list, and a link through the registered renderer |
| Editing round-trips | the editor writes a shape the renderer does not read | a component test edits and asserts `data.document` stays ProseMirror document JSON |
| Restyleability holds | a scoped style, a new class, or a token dependency | contract 003 rules 1–4: no scoped styles, the `data-nightfire-block="rich_text"` root hook is present, and the diff adds no class and no `--nightfire-*` name |
| The render path stays editor-free | the renderer graph picks up an editor module | `effigy check:boundaries` passes |

## Stop conditions

Stop and report if Poodle's published rich-text surface cannot express the pinned
vocabulary, if the wrapper needs a node, mark, or schema definition of its own,
or if a boundary proof forces a choice between the declaration and the
registration. Do not vendor Poodle, add a fallback rich-text engine, or extend
the admitted feature set.

## Evidence

On completion, record: the registered parts, the component-test names, the
boundary and self-registration results, and the exact `effigy qa` result.

Recorded 2026-09-18:

- **Registered parts.** `renderer` from `ts/src/rich-text/render.ts`; `editor`
  and `emptyChecker` from `ts/src/rich-text/editor.ts`. All three `rich_text`
  capability flags in `ts/src/core-blocks.ts` are `true` in the same change, and
  `ts/tests/nightfire/core-self-registration.test.ts` passes with no test-side
  special case for the type.
- **Component tests.** `ts/tests/components/rich-text-block.component.test.ts` —
  "renders structured content through the registered renderer" (heading, list,
  and link), "renders nothing without a document", and "round-trips an edit as
  ProseMirror document JSON".
- **Unit tests.** `ts/tests/nightfire/rich-text-empty.test.ts` (emptiness) and
  `ts/tests/nightfire/rich-text-vocabulary.test.ts` (Poodle's vocabulary, no
  local node, mark, feature, toolbar, style, class, or token).
- **Boundary and self-registration.** `effigy check:boundaries` passes; the
  renderer and render-catalog graphs now name `rich-text/editor.ts` as a module
  that must stay out of them.
- **`effigy qa`.** PASS (exit 0): the full sequence, from `health` and
  `svelte-check` through the unit, component, sanitization, Rust, pack, npm and
  cargo Git-consumer, docs, and release-automation proofs.
