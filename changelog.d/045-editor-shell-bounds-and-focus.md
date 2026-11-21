### Fixed

- `table-model.ts` clamps a stored `rowspan` to the rows the table actually
  has and caps the slots one cell can allocate, so `{ colspan: 1000,
  rowspan: 65534 }` on a one-row table allocates one row's worth of slots
  instead of 65.5M entries or 65k rows. `normalizedRows` reads the largest row
  end with a loop instead of a `Math.max(...)` spread, so a large table cannot
  overflow the call stack.
- `SlashCommandPalette` keeps keyboard focus on the combobox (`tabindex={-1}`
  on the option buttons, `aria-activedescendant` tracks the focused option, and
  Enter is only handled on the combobox), so Enter can no longer activate a row
  other than the one the user is on.
- `ItemListEditor` keys child blocks by their id, so moving or removing a
  sibling no longer remounts the editors that did not change, and typing the
  list title clears a pending item-removal confirmation like an item title
  edit does.
- `ImageEditor`, `DownloadCardEditor`, `VideoEditor` and `TableEditor` give
  their `TextInput`s explicit `ariaLabel`s, matching their placeholders, so
  screen readers and role queries can name each field.
- `NightfireEditor` re-initialises a required value when the `schema` prop
  changes, and `NightfireBlockEditor` keeps the mounted editor when an id-less
  block mints its first `nf_*` id instead of restarting the child editor.

### Consumer migration for 0.6.0

- None. These are behaviour and accessibility fixes behind unchanged props and
  wire values.
