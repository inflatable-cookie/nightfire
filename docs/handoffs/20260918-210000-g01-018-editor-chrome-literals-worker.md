---
title: g01.018 editor chrome literals worker handoff
kind: northstar-handoff
handoff_mode: worker-pr-loop
worker_mode: implementation
dispatch_authority: orchestrator
status: ready-to-launch
owner: inflatable-cookie/nightfire
created: 2026-09-18
updated: 2026-09-18
roadmap: docs/roadmaps/g01/018-editor-chrome-literals.md
base_required: pushed-main
queue_dispatch: northstar-queue
queue_approval: "Operator asked for this fix directly on 2026-09-18 ('Do it') after seeing the measurement that the slash palette renders at 1.00:1 contrast in the shipped default theme, and confirmed the dark chrome reads as leftover rather than design."
queue:
  capability: general
  notifyOriginOnCloseout: true
tags: [coordination, handoff, worker, styling, defect]
---

## What This Thread Was Doing

g01.011 audited the editor tokens and removed every inline `var()` fallback, which proved a precise claim:
24 declared tokens, 24 referenced, one-to-one. But the audit's method was a sweep for `var(--nightfire-*)`
references, so it could not see values written **directly**. The reviewer flagged one instance as a
non-blocking note; measuring it showed it is not cosmetic.

This lane fixes the literals, makes the slash palette legible in the shipped default theme, and closes the
method gap so the next one cannot land.

## Why It Matters

`SlashCommandPalette.svelte` paints a near-opaque dark gradient over `var(--nightfire-color-surface)` and
lets the light theme's dark text sit on top. Measured from a real render, compositing the declared layers:

- search input: `#111827` on `#10182b` — **1.00:1**
- command label: `#000000` on `#141c2e` — **1.23:1**

WCAG AA is 4.5:1 for body text. So the palette is unreadable in the theme this package ships, in a
published release. Without the stylesheet it is readable, which is the reverse of the usual failure.

## Current State

- **Done:** every declared block type renders and is editable; `schemas/` publishes a payload document per
  declared type; `0.2.0` is published on npm and tagged; both release gates pass.
- **Still open:** this defect, and the payload-parity triage note. Nothing else is queued.
- **Active spec lane:** none. `docs/contracts/003-styling-and-restyling.md` is the authority for
  appearance; `docs/architecture/core-package-vocabulary.md` records the editor default layer.
- **Current task:** g01.018 — `docs/roadmaps/g01/018-editor-chrome-literals.md`. This handoff transports it
  and does not replace it.
- **Canonical refs:**
  - `docs/contracts/003-styling-and-restyling.md` — the appearance rules and the token set's role.
  - `docs/contracts/004-review-oracle.md` — implementation and interaction oracle, proven in-repo.
  - `docs/triage/20260918-163000-literals-invisible-to-the-token-audit.md` — the measurement and the
    method gap this lane closes.
- **Remaining continuation envelope:** the literals, the selection token, the guard, and the two counts.
  Do not redesign the palette.
- **Lane budget / pause signal:** no fixed budget; stop at the first stop condition.
- **Key files:**
  - `/Users/tom/Dev/projects/nightfire/ts/src/SlashCommandPalette.svelte`
  - `/Users/tom/Dev/projects/nightfire/ts/src/editor/NightfireMultiBlockItem.svelte`
  - `/Users/tom/Dev/projects/nightfire/ts/src/styles.css` — the token definitions
  - `/Users/tom/Dev/projects/nightfire/ts/scripts/check-boundaries.ts` — the pattern for a source check
    wired into `health`
  - `/Users/tom/Dev/projects/nightfire/effigy.toml` — the `health` list
  - `/Users/tom/Dev/projects/nightfire/docs/architecture/core-package-vocabulary.md` and
    `docs/contracts/003-styling-and-restyling.md` — both state the token count

## Boundaries

- **In scope:** the literals in those two components, one new selection token, a check over component style
  blocks, the two document counts, and a `PROVENANCE.md` line for the new token.
- **Out of scope:** renderers, block payload shapes, `schemas/`, the export map, the package version, the
  release, the Rust crate, and every consumer repository.
- **`ts/src/styles.css` is the exception to the no-literal rule.** It is the definition layer; literals
  belong there. The check applies to component style blocks.
- **No second theme.** The palette becomes light chrome like the rest of the editor. If a dark palette is
  ever wanted, that is a separate design decision with its own tokens, not something to reintroduce here.
- **No renderer changes.** No renderer references a `--nightfire-*` name and none may start.

## Important Context

- **The selection token.** The two blues are `rgba(96, 165, 250, 0.32)` and `rgba(59, 130, 246, 0.14)`, and
  `#3b82f6` is already the value of `--nightfire-color-focus`, so the highlight belongs to the same family.
  Add one named token and use it for both the border and the background at the alphas the component already
  uses. Do not add one token per alpha.
- **Why the labels were invisible.** The command items use `color: inherit`, so they took the host page's
  text colour. The palette root must set `color: var(--nightfire-color-text)` explicitly, or the same class
  of bug returns inside a differently themed host.
- **Two counts, one commit.** Both documents state the number of declared `--nightfire-*` values. They read
  24 today and become 25. The previous lane was asked to correct exactly this after the fact; do it in the
  same change.
- **The guard is the point.** A test that only fixes these two files leaves the next literal free to land.
  The check must fail on a colour literal in any `ts/src/**/*.svelte` style block, with a narrow exception
  list for keywords that are not colours (`transparent`, `currentColor`, `inherit`), and it must be wired
  into `health` so every lane runs it.
- **Provenance.** The new token is locally authored, like `--nightfire-color-focus`; `PROVENANCE.md` already
  records that pattern and should record this one the same way.
- **Open tensions:** none. The defect is measurable, the fix is small, and the guard prevents recurrence.

### Interaction oracle

Per contract 004, asserted in-repo rather than demonstrated:

- The palette's style block references the text and surface tokens and contains **no** colour literal.
- The check fails on a deliberately introduced literal and passes at the head you ship.
- The multi-block item's error state references `--nightfire-color-danger`.
- No renderer references a token.
- The existing component suite and its accessibility assertions pass untouched — the palette's roles,
  keyboard handling and focus behaviour must not change.

If you can assert the composited contrast in the component suite cheaply, do it; jsdom does not composite
backgrounds, so the token-reference assertion plus the no-literal check is the honest floor. Report which
you achieved.

## Suggested Next Move

Start here: read the triage note for the measurement, then `ts/src/SlashCommandPalette.svelte` and
`ts/src/editor/NightfireMultiBlockItem.svelte`, then `ts/scripts/check-boundaries.ts` for how a source check
is written and how it is wired into `health` in `effigy.toml`.

Fix the two components, add the token, write the check and prove it bites, then update both counts and
`PROVENANCE.md`. Run `effigy test --plan`, the component suite, `effigy health`, and `effigy qa`. If the
check cannot be written without an exception list that would swallow a real colour, stop and return that
finding rather than shipping a guard that does not guard.

## Completion Protocol

1. Confirm `docs/roadmaps/g01/018-editor-chrome-literals.md` still describes what you built.
2. Confirm the generation runway and log surfaces reflect what actually happened; the Queue closeout hook
   publishes the terminal lifecycle record and the projections, so do not hand-edit lifecycle state.
3. Say plainly whether a successor lane remains in your envelope. It does not.
4. Record the lane budget or pause signal for this stopping point.
5. Call out unresolved risks or blockers plainly, including anything the guard cannot see — radii, spacing
   and font literals are in the same blind spot and are not covered here.
6. Leave one clear next task for the following thread, which is the payload-parity triage item.

Open one pull request and stop for independent exact-head review. Do not merge, tag or publish.
