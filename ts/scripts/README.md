# Scripts

Repository scripts are proof helpers invoked through Effigy.

| Script | Purpose |
| --- | --- |
| `check-boundaries.ts` | Proves dependency, source-graph, and bundle boundaries |
| `check-colour-literals.ts` | Refuses a colour literal in any `ts/src` component style block |
| `check-renderer-consumer.ts` | Installs Nightfire without Poodle and renders every core block |
| `check-exports.ts` | Proves declared package exports resolve |
| `check-pack.ts` | Proves the packed package contains the intended files |
| `check-release-automation.ts` | Asserts the release workflow's structure and mutation guards as text |
| `check-rust-package.ts` | Tests the freshly unpacked Cargo crate and its fixture |
| `check-schemas.ts` | Proves published JSON Schema documents against the shared wire fixtures |
| `schema-documents.ts` | Shared JSON Schema loader and validator used by `check-schemas` and editor payload tests |
| `check-sanitization.ts` | Exercises malicious markup across supported runtime shapes |
| `check-version-sync.ts` | Proves npm/Cargo version and shared-fixture alignment |
| `check-git-consumer.ts` | Exercises disposable npm and Cargo Git consumers |
| `npm-admission.ts` | Refuses to certify a candidate from a dirty tree |
| `npm-archive.ts` | Packs once and writes the candidate identity manifest |
| `npm-publication.ts` | Publication authority, candidate manifest and tarball readers the npm proofs share |
| `verify-npm-candidate.ts` | Verifies a candidate archive set against tag, commit, packages and hashes |
| `oxide-rust-runner.sh` | The one Rust route: oxide locally, Cargo in CI or on the explicit escape |
| `rust-route.ts` | Shared route helper for proof scripts that run Cargo |
| `run-test-files.ts` | Runs selected Bun test files with consistent setup |

Use the matching `effigy` task instead of invoking a script directly unless
debugging the script itself.

## Shared Svelte loader

`ts/tests/setup/svelte-plugin.ts` compiles `.svelte` and `.svelte.ts` for the
component tests, `check-boundaries.ts` and `check-renderer-consumer.ts`. It
imports TypeScript and `svelte/compiler`, so those proof helpers need
`effigy bootstrap:deps` first. Bun resolves a bare specifier from its global
install cache when `node_modules` is missing, and the cached TypeScript 7 root
export is version metadata only, so the loader refuses a toolchain that resolves
outside this checkout, or a TypeScript without the compiler API, by name instead
of failing inside a component.

## Release proofs

`npm-publication.ts` is the one reader of `release-manifest.json`'s
`npmPublication` authority, and it also owns the candidate identity manifest:
schema name, structure parsing, SHA-256 via `node:crypto`, and the
`package/package.json` reader. `npm-admission.ts` requires a clean exact head,
`npm-archive.ts` packs once and writes the manifest, and
`verify-npm-candidate.ts` checks the archive set against the tag, the commit and
every recorded hash before any publish. A flag passed without a value is
refused rather than ignored.

## Rust route

Every local Cargo command goes through `ts/scripts/oxide-rust-runner.sh`:

```sh
sh ts/scripts/oxide-rust-runner.sh run check --workspace --all-targets --locked
sh ts/scripts/oxide-rust-runner.sh tool rust/nightfire/Cargo.toml -- cargo package --locked
```

`run` routes one Cargo command to `oxide`. `tool` routes a tool that runs Cargo
itself to `oxide exec --manifest-path <manifest> --`, so the command is bound to
one Cargo workspace. `GITHUB_ACTIONS=true` runs Cargo, and
`EFFIGY_OXIDE_ESCAPE=cargo` is the explicit escape for one local invocation.
There is no automatic fallback and no per-selector `:cargo` variant: a missing
or refusing Oxide reports its own error and that escape. `check:git-consumer:cargo`
names the consumer's language, not an escape route.

Oxide places build output in its managed storage, so it refuses a workspace that
is not a Git work tree ignoring `target`. The proofs that build a disposable
workspace (the unpacked crate in `check-rust-package.ts`, the Rust Git consumer
in `check-git-consumer.ts`) prepare it as a throwaway Git work tree for that
reason. Oxide owns those targets, so their output lands in the managed pool and
outlives the temporary directory: reclaiming it is Oxide's job (`oxide clean`),
not the proof's.
