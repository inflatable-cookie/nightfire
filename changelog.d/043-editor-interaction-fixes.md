### Fixed

- `TableEditor` lands on column 0 of the row it appends when Tab leaves the
  last cell, so the next Tab walks the new row instead of appending another.
  Ctrl/Cmd+Shift+S on an unsplittable cell is a no-op that neither emits a
  block nor clears a pending confirmation, and the post-edit focus query uses
  the clamped cell coordinates.
- `TableEditor`'s span reader caps `colspan` at 1000 and `rowspan` at 65534,
  matching `render-document.ts`, so malformed stored data cannot allocate the
  slot grid from a span it does not mean.
- `NightfireEditor` closes the slash palette on structural block changes
  (add, remove, reorder, retype) while a content edit keeps it open, resets
  `lastSchemaMismatchReported` when the mismatch clears or the schema changes,
  and initialises a required empty value once the strategy has settled, emitting
  it through `onChange` for controlled callers without `bind:value`. The
  required message is a `role="alert"`.
- `NightfireBlockEditor` keys the mounted editor by block id and type, so a
  sibling block of the same type mounts without the previous block's local
  state.
- `MarkdownEditorSurface` renders its label text as a plain element instead of
  wrapping the toolbar, textarea and preview in one `<label>`.
- The block editors that copy a block id (`RichTextEditor`, `ImageEditor`,
  `VideoEditor`, `DownloadCardEditor`, `MarkdownEditor`) read `block?.id`, so a
  missing block no longer throws.

### Consumer migration for 0.6.0

- None. These are behaviour fixes behind unchanged props and wire values; a
  stored table cell with a span above the HTML limit now lays out clamped
  instead of allocating from it.
