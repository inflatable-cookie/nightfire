### Fixed

- Scope the Cargo workspace version match to `[workspace.package]`, reuse the
  comment-aware import reader for the forbidden-package scan, and keep the
  render catalog out of the block-editor module set in the boundary proof.
- Report a verify-candidate flag followed by another flag as `--flag requires
  a value`, exit nonzero when a sanitization child is signal-killed, and await
  Svelte 5 async unmount before the next component test starts.
- Sync `working-rules.md` with `oxlint --type-aware` and the tooling tsconfig
  inheritance, and drop the redundant `effigy health` step before `effigy qa`
  in CI.

### Consumer migration for 0.6.0

- None. This changes QA scripts, tests, docs, and CI only; no package API or
  wire contract change.
