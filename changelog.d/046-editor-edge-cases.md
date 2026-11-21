# 046: Final editor edge cases for 8/10

- `TableEditor`: guard `requestRemove` on 1-row/1-column tables, clear a
  pending removal dialog when the grid shrinks past its line, and clear it
  when `remove` bails on a last line.
- `ImageEditor` / `DownloadCardEditor`: ignore a pending `mediaSource.pick()`
  result after unmount so `onChange` never fires post-teardown.
- `DownloadCardEditor`: key file rows by unique `media_id` (index fallback
  only on duplicates) so removing a row no longer remounts survivors.
- `NightfireBlockEditor`: drop the legacy `{ block }` unwrap and make
  `editorKey()` pure (id-swap tracking moves into an effect).
- `ItemListEditor`: key outer items by object identity (position fallback for
  non-objects/duplicates) and drop a pending removal dialog when the list
  shrinks past its item.
- `strategy-normalisation`: only a non-empty string different from `schema`
  is reported as `schemaMismatch`.
