# Nightfire

Nightfire is the standalone generic block-content system for Rust and
TypeScript/Svelte. It owns the durable value envelope, blocks, strategies,
registries, normalization, validation, hashing, block IDs, media locators,
markdown rendering, and generic editors. Product schemas, product blocks, and
application integrations stay in consumers.

The repository keeps the TypeScript/Svelte implementation under `ts/`, the
Rust crate `nightfire` under `rust/`, and shared wire fixtures at the root.
`0.1.0` is published on npm and tagged `v0.1.0`.

## Install

After the first dual-language release, TypeScript consumers use:

```sh
bun add github:inflatable-cookie/nightfire#<commit>
```

Rust consumers use the same immutable repository tag:

```toml
nightfire = { git = "ssh://git@github.com/inflatable-cookie/nightfire.git", tag = "v0.1.0" }
```

Svelte 5 is a peer dependency. Consumers using the **editor** must load the
default editor styling; renderers carry no appearance and need none of it:

```ts
import "@inflatable-cookie/nightfire/styles.css";
```

The stylesheet is the editor's default appearance layer, not a renderer theme.
Its declared `--nightfire-*` names are the public override surface: consumers
can re-declare a name in their own scope without a fork, build step, or
Nightfire dependency. The six app-shaped names (`color-surface`,
`color-surface-secondary`, `color-danger`, `color-field-bg`, `button-chip-padding-block` and
`button-chip-padding-inline`) are intentionally retained as stable editor-chrome API names.

To align Nightfire's editor defaults with Poodle's variables, map them on the
wrapper that contains the editor:

```css
.nightfire-theme {
  --nightfire-color-danger: var(--poodle-color-status-danger);
  --nightfire-color-border-subtle: var(--poodle-color-border-default);
}
```

Keep this mapping wrapper-scoped; a `:root` override depends on stylesheet load
order. The mapping is a consumer recipe, not a Poodle dependency.

## Imports

Use the narrowest export for the job:

```ts
import type { NightfireValue } from "@inflatable-cookie/nightfire/types";
import { prepareNightfireForSave } from "@inflatable-cookie/nightfire/validation";
import { NightfireRenderer } from "@inflatable-cookie/nightfire/renderer";
```

`core` and `validation` have no Svelte runtime edge. Registry modules use
Svelte only for type declarations. Importing `renderer` does not load editors
or registration side effects. Editor and renderer registration modules remain
explicit opt-ins.

The Rust crate exposes the matching value, block, strategy, registry,
validation, hashing, block-ID, and media-locator contracts. Both languages use
the shared versioned fixtures under `fixtures/wire/`.

JSON Schema 2020-12 documents for the generic wire mechanics and every declared
core block payload ship under `schemas/`. Their stable mechanics identifiers are
`nightfire.value@1`, `nightfire.block@1`, `nightfire.registry@1`, and
`nightfire.strategy@1`. References stay relative so consumers can copy and
validate the tree offline.

The wire shape is:

```ts
interface NightfireValue {
  schema: string;
  blocks: Array<{
    id?: string;
    type: string;
    version: string;
    data: Record<string, unknown>;
  }>;
}
```

Saving validates versions, drops invalid blocks, and assigns missing `nf_`
UUIDv7-style block IDs. Unknown versions fail closed. Legacy v1 sibling
`block` envelopes are rejected rather than silently migrated.

Markdown is parsed by `marked` and sanitized by `isomorphic-dompurify` before
entering Svelte `{@html}`. The malicious fixture suite exercises SSR, browser,
and a Tauri-shaped WebView environment.

## Development

```sh
effigy tasks
effigy test --plan
effigy qa
```

## Project documentation

Start at [docs/README.md](docs/README.md). It routes to the package vision,
architecture, contracts, local roadmap, and evidence. Dependency extraction
evidence lives in [PROVENANCE.md](PROVENANCE.md); contribution rules live in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Dependencies

- `@inflatable-cookie/poodle-svelte`: generic field, control, and markdown
  editor components used by the retained Svelte editor surface.
- `svelte` (peer): component runtime supplied by the consumer.
- `marked`: retained markdown parsing behavior.
- `isomorphic-dompurify`: one sanitizer contract across DOM and SSR runtimes.
- `serde` and `serde_json`: retained Rust wire serialization and JSON payloads.
- `blake3`: retained deterministic block-data hashing.
- `uuid`: retained UUIDv7 block ID generation and serialization.
- `thiserror`: retained typed media-locator and validation errors.

Test-only packages provide Bun types, TypeScript/Svelte checking, jsdom, and DOM
component assertions. The completed repository must contain no Underlay,
SvelteKit, Vite, bits-ui, lucide-svelte, zod, or smol-toml dependency in either
language tranche.

## License

MIT. See [LICENSE](LICENSE).
