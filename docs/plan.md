# Plan

Updated: 2026-09-26

## Now

1. **Payload schemas verified against the implementation** — a payload document
   can disagree with the block it describes and stay green, because
   `check-schemas.ts` validates hand-written examples. The consumer named this
   exact failure as the one it will not consume. Compare each core block's
   document with what its editor writes and renderer reads, then make the
   comparison executable, most likely as per-block payload cases in the shared
   wire fixture. Those cases must be satisfiable by the Rust side or scoped to
   TypeScript deliberately. Keep the unknown-property counterexamples and the
   set-equality check. See
   [vocabulary](knowledge/domain/vocabulary.md#published-schemas).
2. **Style-literal guard says what it covers** — `check:style-literals` guards
   colours only, and its name implies all style literals. Rename the check and
   its message to say colours; tokenise nothing new. See Q-002.

## Next

- **Next release** — carries the slash-palette colour fix and
  `--nightfire-color-selection`, which are on `main` and in no published
  version: `0.2.0` ships a palette measured at 1.00:1 and 1.23:1 contrast.
  Confirm the published `styles.css` declares `--nightfire-color-selection` by
  consuming it. Follow [release](knowledge/contracts/release.md). Open: Q-001.

## Not now

- Runnable demo surface — the operator chose in-repo interaction testing
  instead; see [review oracle](knowledge/contracts/review-oracle.md).
- Crate-registry publication of the Rust crate — tag-only by design.
- Authoring named table row sections — waits on a consumer that targets them;
  see [vocabulary](knowledge/domain/vocabulary.md#named-row-sections).
- Table column widths and image free-form widths — rejected; appearance belongs
  to the consumer.
