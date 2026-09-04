# Nightfire

Nightfire is the generic TypeScript and Svelte block-content package extracted
from Underlay. It owns the durable Nightfire value envelope, registries,
normalization, validation, markdown rendering, generic editors, and media
locators. Product schemas and product block registrations stay in consumers.

The package is currently private and consumed from an immutable repository
commit during bootstrap. Publishing and release tags are outside this card.

## Install

```sh
bun add github:inflatable-cookie/nightfire#<commit>
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

See [docs/README.md](docs/README.md), [PROVENANCE.md](PROVENANCE.md), and
[CONTRIBUTING.md](CONTRIBUTING.md).

## Dependencies

- `@inflatable-cookie/poodle-svelte`: generic field, control, and markdown
  editor components used by the retained Svelte editor surface.
- `svelte` (peer): component runtime supplied by the consumer.
- `marked`: retained markdown parsing behavior.
- `isomorphic-dompurify`: one sanitizer contract across DOM and SSR runtimes.

Test-only packages provide Bun types, TypeScript/Svelte checking, jsdom, and DOM
component assertions. The repository contains no Underlay, SvelteKit, Vite,
bits-ui, lucide-svelte, zod, or smol-toml dependency.

## License

MIT. See [LICENSE](LICENSE).
