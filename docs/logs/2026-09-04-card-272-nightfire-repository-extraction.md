# Card 272 Nightfire repository extraction

Date: 2026-09-04

## Scope

Bootstrapped the root `@inflatable-cookie/nightfire` package and extracted the
generic Nightfire TypeScript/Svelte surface, unit/component tests, synthetic
security and wire fixtures, styles, package metadata, repository contracts, and
Effigy validation surface. No consumer repository, Rust source, product block,
product schema, tag, release, or registry was changed.

## Inputs

- Standalone base: `ef6bd115f4e4082bf9c3399343eec3548ba85fcd`
- Underlay extraction commit:
  `7ef7f8e30c3e36fda3a277681405bd5aa5e8703d`
- Underlay Nightfire TypeScript tree:
  `1b4c1a3c8a7d8ca6e68d8e3aa62a8c39036b384a`
- Underlay main at Rust verification:
  `f4d51367e782455c141dc5058dd435d468d54003`
- Underlay Nightfire Rust tree at both extraction commit and verification:
  `8f4f38289e40f4e00625745a68843a3e734e4dbb`
- First pushed standalone implementation commit:
  `ceae38d07d48049ea8723dabbd7bab382dd00724`

The Rust tree was unchanged between the extraction input and verification
heads. Provenance and deliberate standalone adaptations are listed in
[`PROVENANCE.md`](../../PROVENANCE.md).

## Validation

Passed in the implementation worktree:

```sh
bun install --frozen-lockfile
effigy tasks
effigy test --plan
effigy doctor --verbose
effigy test
effigy qa
git diff --check
```

The configured Effigy test board passed:

- 112 generic unit and TypeScript/Rust fixture-conformance assertions;
- 8 Svelte component assertions;
- 12 malicious sanitization assertions: 4 SSR, 4 browser, 4 Tauri-shaped
  WebView execution;
- zero failures.

`effigy qa` additionally proved:

- Svelte check: 0 errors and 0 warnings;
- TypeScript check: passed;
- export map: 20 explicit subpaths resolved;
- framework boundary: core bundle 3,986 bytes, validation bundle 3,965 bytes;
- renderer boundary: 5,692 bytes, four package inputs, no editor module or
  registration side effect;
- forbidden direct/transitive package and source imports: absent;
- pack inventory: 55 files, 31,720 bytes; no tests, scripts, docs, Effigy
  manifest, or unrelated source in the tarball;
- documentation links and agent contract: passed;
- whitespace check: passed.

The malicious fixtures cover scripts, event handlers, `javascript:` URLs,
encoded `data:text/html` content, and SVG-linked payloads while retaining safe
text and HTTPS URLs. The Tauri case runs the browser sanitizer under a DOM with
the Tauri runtime marker present; no separate sanitizer branch exists.

The Rust wire crate ran read-only with an isolated temporary target:

```sh
CARGO_TARGET_DIR=<temporary-directory> cargo test -p underlay-nightfire --locked
```

Result: 35 passed, 0 failed; one documentation test ignored. The isolated build
directory was removed after the run.

## Clean install and dependency evidence

A fresh clone checked out `ceae38d`, started without `node_modules`, and ran:

```sh
bun install --frozen-lockfile
du -sk node_modules
effigy qa
```

Result: 91 packages installed, `node_modules` measured 82,172 KiB, and the full
QA board passed. Counts and size are evidence, not limits. `bun pm ls --all` and
the committed lock scan showed none of Underlay, SvelteKit, Vite, bits-ui,
lucide-svelte, zod, or smol-toml. Retained dependency reasons are recorded in
the root README.

## Repository-commit consumption

A blank temporary consumer ran:

```sh
bun init -y
bun add git+https://github.com/inflatable-cookie/nightfire.git#ceae38d
bun -e '<import core, validation, package metadata; resolve renderer; save one synthetic block>'
```

The install resolved
`@inflatable-cookie/nightfire@github:inflatable-cookie/nightfire#ceae38d`,
installed 65 packages, imported the framework-free entrypoints, resolved
`src/renderer.ts` through the export map, and generated an `nf_` UUIDv7-style
ID during save preparation. The temporary clone and consumer were removed.

## Negative gates

- Product token/source scan: no Acowtancy, Froyo, Bovine, or Dairy block/schema
  behavior in source, tests, or fixtures.
- Registry imports from Svelte are type-only.
- No forbidden dependency appears in `package.json` or `bun.lock`.
- No package tarball remains in the repository.
- No Git tag, npm publication, consumer change, or release action occurred.
