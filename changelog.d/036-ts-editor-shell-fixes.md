### Fixed

- Clearing a `table` caption now removes `caption` from `block.data` instead of restoring the previous value.
- `NightfireEditor` with `required` now checks structural emptiness, so a mounted draft block with no content yet is preserved rather than overwritten.
- `ImageEditor`, `DownloadCardEditor`, and `createRichTextImageRequest` now guard `mediaSource.resolve()` and `pick()` with `try/catch` and require a non-blank `url` before using a resolved media entry.
- `DownloadCardEditor` keys file rows by `${file.media_id}:${index}` so externally authored blocks with duplicate `media_id` entries do not throw `each_key_duplicate`.
- `ItemListEditor` and `TableEditor` clear pending confirmation dialogs whenever items, rows, or columns change so a non-modal `alertdialog` cannot act on a stale index.
- `NightfireEditor` focuses editing controls (`textarea`, `[contenteditable="true"]`, `input`, `select`) before falling back to `button` after inserting a block via slash commands.
- `VideoEditor` reconciles incoming `embed` updates structurally (`provider`, `id`, `originalUrl`, `originalEmbed`) instead of by object identity, so parents that clone `value` in `onChange` do not overwrite the URL input mid-edit.

### Changed

- `buildGroupedOptions` now orders the three generic categories as `Text` (1), `Media` (2), and `Layout` (3).
- Removed the unused `onBlockContextChange` prop from `NightfireMultiBlockItem`.
