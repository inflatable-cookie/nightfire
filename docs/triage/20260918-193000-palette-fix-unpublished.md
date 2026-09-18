# The editor-chrome colour fix is on main but in no published version

Recorded 2026-09-18 by operator decision: let it ride to the next release rather than cut a patch.

## What is on main and not published

g01.018 (`beb9cca`) turned the slash palette into light chrome and added `--nightfire-color-selection`.
It landed **after** `0.2.0` was tagged `v0.2.0` at `1931cfc`. So:

- `@inflatable-cookie/nightfire@0.2.0` still ships the dark palette whose search input measured **1.00:1**
  and whose command labels measured **1.23:1** against the composited background in the shipped default
  theme. Anyone using the published package's editor gets unreadable slash-palette labels.
- The fix and the new token sit in `[Unreleased]` in `CHANGELOG.md`, and `check:style-literals` runs in
  `health` — which affects contributors, not consumers.

## Why it matters

This is a decision rather than an oversight, but it is the kind that disappears if it is not written down:
the fix is *done*, on the integration branch, with a green guard behind it, and none of that reaches a
consumer until a release carries it. "It's fixed" and "it's shipped" are different claims.

## The next check, in order

1. **When the next release is planned, confirm this is in it.** Either the release commit is at or after
   `beb9cca`, or the published artifact's `styles.css` declares `--nightfire-color-selection`.
2. **g01.017 is complete**, so the next release needs its own card. Name this as one of its gates when it
   is written, beside whatever else that release carries.
3. **Verify by consuming**, the way `0.2.0` was verified — install the published version and read the
   palette's tokens out of it — rather than by checking that the file list changed.

## Do not

Do not treat this as already shipped because it is on `main`. The integration branch and the registry are
different places, and this note exists precisely because they currently disagree.
