### Fixed

- A strategy that sets only `allowed_types` now rejects a block whose type is
  not listed. It previously accepted every type.
- `coerce_block_versions` resolves every block before it changes any, so a
  failure leaves the value unchanged instead of half-upgraded.
- `NightfireMediaLocator::new` and `parse` reject a block id that contains `#`,
  which broke the locator key round trip. They also reject an empty pointer and
  a `~` that does not escape `0` or `1`.
- `MultiConfig::with_max_blocks` rejects a maximum below the minimum, which
  includes `0`, so a strategy cannot be built that no value satisfies.
- `BlockVersions` cannot hold an empty supported set or a `current` outside it.
- `CardinalityMismatch` displays "expected exactly 1 block, got 0" rather than
  Rust Debug syntax.

### Changed

- `BlockVersions` and `NightfireMediaLocator` fields are private. Read them with
  `current()`, `supported()`, `block_id()` and `data_pointer()`. Build a
  `BlockVersions` with `BlockVersions::new`.
- `MultiConfig::with_max_blocks` returns `Result<MultiConfig, MultiConfigError>`.
- `Block::VERSIONS` must list at least one version. `active_version`, `versions`
  and `export` panic when it is empty.
- Validation and `StrategyRegistry::validate` need only `C: PartialEq`. The
  registry storage no longer requires `Eq + Hash` on the category type.
- Validation no longer allocates on the happy path.
- `SchemaId` implements `Display`, `AsRef<str>` and `Borrow<str>`.
- `BlockData` and `NightfireValue` implement `PartialEq`;
  `NightfireValidationError` implements `PartialEq` and `Eq`.

### Removed

- `resolve_block_implementation` and `NightfireMediaLocator::find_block`. Neither
  had a caller.

### Consumer migration for 0.6.0

- Handle the `Result` from `with_max_blocks`, for example with `?`.
- Replace direct reads of `BlockVersions` and `NightfireMediaLocator` fields
  with the accessors.
- Check every strategy that sets only `allowed_types`. Any stored block type
  missing from that list is now rejected.
- Stored media locators with an empty pointer (`block#`) or a `#` in the block
  id no longer parse. Re-key them before upgrading.
