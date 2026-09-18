# g01.013 Video Embed Block

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`, `docs/contracts/003-styling-and-restyling.md`
Depends on: g01.008 — same declaration and catalog files
UI classification: refinement — compact brief below

## Outcome

`video` renders a video embed from Poodle's own embed model, so provider parsing, previewing and
rendering stay Poodle's. It references no media library.

## Context

Poodle publishes both halves: `EmbedInput` parses a URL into `ParsedEmbed`, and `renderEmbed` turns
`ParsedEmbed` back into markup. `ParsedEmbed` is
`{ provider, id, originalUrl?, originalEmbed?, width?, height?, embedType? }`. Mirroring it is the same
rule the rich-text vocabulary already follows: the admitted set is declared in Poodle and validated
there, so this block mirrors it rather than extending it.

## Decisions

- **Block data.** `{ embed: ParsedEmbed, title?, caption? }`.
- **Authoring.** `EmbedInput`, with the consumer supplying the allowed provider list.
- **Rendering.** `renderEmbed(embed)` returns HTML, so it goes through the existing sanitizer before
  `{@html}`. Contract 002 requires it, without exception.
- **No library.** An embed is addressed by provider and id, not by a library reference, so the
  media-source registry is not involved.
- **Direct-file playback is not this block.** A consumer that wants `<video src>` uses Poodle's
  `VideoPlayer` inside its own profile block. Widening this type to cover both would make one type
  mean two things, which is what retiring `media` was meant to stop.
- **`title` is the accessible name** on the embed frame; `caption` is visible text under it.

## UI design brief (compact)

- **Classification and workflow:** refinement. The author pastes a URL, sees the parsed provider, and
  optionally adds a title and caption.
- **Presentation direction:** semantic markup, `data-nightfire-block="video"`, no scoped styles, no
  class of our own, no new token.
- **States:** empty value → nothing rendered; unparseable value → the editor shows the parse error and
  stores nothing; parsed → the embed renders, with the title as the frame's accessible name.
- **Scenario oracle:** paste a supported URL, confirm the provider is detected, save, reload, and see
  the same embed rendered. Then paste an unsupported URL and confirm the editor refuses it rather
  than storing a partial value.

## Work

1. Add the `video` renderer and editor; register both from the catalog files and declare their
   side-effect modules.
2. Flip the `video` capability flags in `ts/src/core-blocks.ts` in the same change.
3. **Add `schemas/blocks/video.schema.json` in the same change.** `ts/scripts/check-schemas.ts` asserts
   exact set equality between the payload documents under `schemas/blocks/` and `CORE_BLOCK_TYPE_NAMES`,
   and it runs in `health`, so declaring `video` without its document fails `qa` everywhere. The pinned
   handoff lists the schema lane as out of scope; read that as "do not restructure the schema tree".
   This one document is part of this task.
4. Sanitize the rendered embed markup, and prove it with a component test carrying a hostile embed
   value.
5. Prove the declaration holds, and prove the renderer stays editor-free.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The model is Poodle's | a local provider parser or embed schema appears | no provider list, parser or embed shape is defined under `ts/src` |
| The declared set and the published set agree | `video` is declared with no payload document | `effigy check:schemas` passes, and `schemas/blocks/video.schema.json` describes the pinned shape |
| Sanitization cannot be skipped | rendered embed HTML reaches `{@html}` unsanitized | the sanitization test covers the embed path |
| Unsupported input is refused | an unparseable URL is stored and renders nothing | the editor stores no value when parsing fails |
| The render path stays editor-free | the renderer imports `EmbedInput` | `effigy check:boundaries` passes |
| Restyleability holds | a scoped style, a new class, or a new token | contract 003 rules 1–4 |

## Stop conditions

Stop and report if the sanitizer cannot express the embed markup, if Poodle's embed model needs an
extension for a supported provider, or if the lane is pushed to cover direct-file playback as well.

## Video payload shape to publish

The payload document follows the six that exist, with the same `$schema`, a
`nightfire.block.video@1` `$id`, and `additionalProperties: false`:

```
{ embed: ParsedEmbed, title?: string, caption?: string }
```

`ParsedEmbed` is Poodle's, so describe it structurally rather than as a reference to Poodle:
`{ provider: string, id: string, originalUrl?: string, originalEmbed?: string, width?: number,
height?: number, embedType?: "video" | "audio" | "playlist" | "generic" }`, with only `provider` and
`id` required.

## Evidence

On completion, record: the registered parts, the sanitized render path, the provider list source, the
component tests, and the exact `effigy qa` result.
