# Poodle 0.4.2 adoption

- Date: 2026-09-16 14:00:00 +0100
- Scope: Nightfire repository dependency pin and call sites
- Task: [g01.006](../../roadmaps/g01/006-adopt-published-poodle-0-4-2.md)

## Changed manifests

- `package.json`: `@inflatable-cookie/poodle-svelte` `0.2.2` → `0.4.2`.
- `bun.lock`: regenerated. `@inflatable-cookie/poodle-core` and
  `@inflatable-cookie/poodle-svelte` both resolve to `0.4.2`.

No `@inflatable-cookie/poodle-*` pin below `0.4.2` remains.

## Call sites

Poodle 0.4.2 stops re-exporting `MarkdownEditor` from the package root; it moves
to the `./markdown` subpath. Two Nightfire wrappers now import from
`@inflatable-cookie/poodle-svelte/markdown`:

- `ts/src/markup/MarkdownEditor.svelte`
- `ts/src/markup/MarkdownEditorSurface.svelte`

Both still pass `renderHtml={renderSafeMarkdownPreview}`, and Poodle's default
`htmlPolicy="safe"` now sanitizes the complete parser result too. Nightfire's
own sanitizer still runs first, so the `{@html}` path stays sanitized.

The other 0.3/0.4 removals named by the task (Slider/RangeSlider `appearance`,
`poodle-specs` Slider items, `poodle-headless` text helpers, `poodle-node`
`NodeRole`/`NodeA11y.initial_focus`) do not appear in this repository. No shim
was added.

## Validation

`effigy qa` passed at the pushed implementation head: `svelte-check` with 0
errors and 0 warnings, `tsc --noEmit`, the TypeScript unit/wire suites, the
component and pattern suites, the SSR/browser/Tauri sanitization suites,
Rust format/check/clippy/tests and Cargo package proof, the packed npm/Cargo
subpath checks, the Git-consumer proofs, and the documentation and Northstar
gates.
