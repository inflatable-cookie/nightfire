### Fixed

- `VideoEditor` now falls back to `originalEmbed` when `originalUrl` is absent, so reloading or updating embeds authored from pasted `<iframe>` markup populates `EmbedInput`.
- `NightfireFieldBlockShell` strips synthetic `nightfire-unsaved-block-*` fallback IDs before forwarding block updates, letting `prepareNightfireForSave` assign persistent `nf_*` IDs.
- `TableEditor` clamps selection anchor coordinates alongside focus coordinates when `block` shrinks externally, clears editing mode on cell focus, and adds `justify` and `baseline` alignment options matching `schemas/blocks/table.schema.json`.
- `NightfireEditor` verifies the slash-command target block still exists and has `type === "markdown"` before applying a slash command, and `NightfireBlockEditor` drops the unnecessary `render-registrations` side-effect import.
- `ImageEditor` drops invalid out-of-enum `sizing` values when editing other fields, and `SlashCommandPalette` exposes `role="combobox"` and `aria-expanded="true"` on the search input with `role="presentation"` on option list item wrappers.
