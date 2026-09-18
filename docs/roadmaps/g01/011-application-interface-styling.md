# g01.011 Application Interface Styling

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`, `PROVENANCE.md`
Depends on: an operator decision
Ready state: blocked — operator decision on where the interface styling lives

## Outcome

`ts/src/styles.css` stops being an accident of extraction. The interface token set
has a declared owner, and this package either keeps a documented content-styling
surface or ships none.

## Context

The extracted `--nightfire-*` set has 23 properties. Six are UI-shaped:
`button-chip-padding-block`, `button-chip-padding-inline`, `color-field-bg`,
`color-danger`, `color-surface`, and `color-surface-secondary`. A markdown, table,
or list renderer needs none of them. `PROVENANCE.md` traces the values to
Underlay's `ts/src/styles.css`, an application stylesheet, and records the
retained `underlay-*` class selectors as extraction artifacts that are not an
integration hook.

A contract asserting that this package owns a theme surface was written on
2026-09-18 and removed the same day for that reason.

## Why this is not a file deletion

`./styles.css` is a declared export and its `**/*.css` entry sits in
`package.json` `sideEffects`. `ts/scripts/check-exports.ts` compares the export
map against an explicit expectation **in both directions**, so removing the
subpath is a checked contract change rather than cleanup.

## The decision

Where does the application interface styling live?

- **The desktop application.** This package ships no interface styling, the
  `./styles.css` subpath and its `sideEffects` entry are removed, and a consumer
  that imports the subpath supplies its own values. Cost: that consumer import
  breaks, so the removal needs a declared clean break.
- **A shared design system.** One theme surface across packages, depended on
  rather than copied. Cost: that system must be published and versioned first.
- **Nowhere.** The tokens are deleted and content renderers stay unstyled. Cost:
  any consumer that relied on the defaults loses them.

A content-renderer styling need, if one exists at all, is a separate question:
which `--nightfire-*` names are content rather than interface.

## Ready-state rubric

- [ ] Operator decision recorded above.
- [ ] Declared effect on the export map and `check-exports.ts`.
- [ ] Declared effect on `sideEffects`, `PROVENANCE.md`, and any consumer import.
- [ ] Migration or clean-break decision for a consumer importing `./styles.css`.

## Next step

Operator decision. Until it lands, no style change is dispatched.
