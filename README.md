# Nightfire

Nightfire is the standalone generic block-content system for Rust and
TypeScript/Svelte. It owns the durable value envelope, blocks, strategies,
registries, normalization, validation, hashing, block IDs, media locators,
markdown rendering, and generic editors. Product schemas, product blocks, and
application integrations stay in consumers.

Current `main` contains the TypeScript/Svelte tranche extracted by Market Card
272. Market Card 278 is ready to reshape the repository under `ts/` and `rust/`
and extract the authoritative Rust crate `nightfire`. Do not release the
current TS-only state.

## Install

After the first dual-language release, TypeScript consumers use:

```sh
bun add github:inflatable-cookie/nightfire#<commit>
```

Rust consumers use the same immutable repository tag:

```toml
nightfire = { git = "ssh://git@github.com/inflatable-cookie/nightfire.git", tag = "v0.1.0" }
```

Svelte 5 is a peer dependency. Consumers using the editor or renderer must also
load the standalone design tokens:

```ts
import "@inflatable-cookie/nightfire/styles.css";
```

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

Test-only packages provide Bun types, TypeScript/Svelte checking, jsdom, and DOM
component assertions. The completed repository must contain no Underlay,
SvelteKit, Vite, bits-ui, lucide-svelte, zod, or smol-toml dependency in either
language tranche.

## License

MIT. See [LICENSE](LICENSE).
