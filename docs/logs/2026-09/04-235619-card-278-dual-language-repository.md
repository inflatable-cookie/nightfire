# Card 278 dual-language repository

- Date: 2026-09-04 23:56:19 +0100
- Base: `7870d6a6e4ab0d7fb19abeee908284527d323156`
- Validated implementation head: `a257f1d894d4eb7d101cb41bae73e1cc5248955f`
- Scope: Nightfire repository only

## Provenance

The Rust extraction came from `inflatable-cookie/underlay` commit
`7ef7f8e30c3e36fda3a277681405bd5aa5e8703d`, path
`rust/crates/underlay-nightfire`, Git tree
`8f4f38289e40f4e00625745a68843a3e734e4dbb`.

Eleven unchanged implementation and test files matched the source byte for
byte by SHA-256. Reviewed adaptations were limited to:

- package name `underlay-nightfire` to `nightfire`;
- root workspace metadata at version `0.1.0`, edition 2021, Rust 1.95, MIT,
  and the retained workspace clippy posture;
- crate import examples and source comments that named the old package,
  source repository, or one product;
- generic crate README wording and the repository URL;
- a copied MIT licence file for the Cargo package;
- one new integration test consuming the shared root wire fixture.

The original 35 Rust tests were copied intact. No Underlay adapter, product
block, schema, registration, persistence code, HTTP conversion, or consumer
code entered the repository.

## Repository shape

TypeScript/Svelte source, tests, scripts, and config moved under `ts/` without
behavioral edits. The root npm manifest remains
`@inflatable-cookie/nightfire`; all 20 existing export subpaths now resolve
into `ts/src`. The root Cargo workspace exposes package `nightfire` from
`rust/nightfire`. Both manifests use `0.1.0`; both test tranches consume
`fixtures/wire/v1/nightfire-values.json`.

## Validation

`effigy qa` passed at the validated implementation head. It proved:

- 112 TypeScript unit and wire assertions;
- 8 Svelte component assertions;
- 12 sanitization assertions across SSR, browser, and Tauri-shaped execution;
- 35 preserved Rust unit tests and 3 shared-fixture integration tests;
- Rust format, check, clippy with warnings denied, and Cargo package verify;
- Svelte check with 0 errors and 0 warnings, plus TypeScript check;
- 20 npm subpaths, 55 packed npm files, and 21 packed Cargo files;
- npm/Cargo version `0.1.0` and one shared root wire fixture;
- forbidden dependency/source graph absence and renderer/editor isolation;
- documentation, Northstar, and whitespace gates.

Disposable consumers pinned the pushed Git commit, not the worktree:

```text
@inflatable-cookie/nightfire@github:inflatable-cookie/nightfire#a257f1d
nightfire = { git = "https://github.com/inflatable-cookie/nightfire.git", rev = "a257f1d..." }
```

The npm consumer imported the existing validation subpath and prepared a
synthetic block with an `nf_` ID. The Cargo consumer resolved package
`nightfire`, constructed the matching value, and generated an `nf_` ID. Both
temporary consumers and build directories were removed.

## No release

`git ls-remote --tags origin` returned no tags before handoff. No tag, GitHub
release, npm publication, crates.io publication, release command, merge, or
consumer-repository edit occurred. Card 278 stops at an open PR for independent
exact-head review.

## 2026-09-05 repair validation

PR #2 review at `d54f12d03236dd079d55562541b43a3de808b62b`
found that Cargo omitted the root fixture from its package and that both wire
suites asserted only a partial, partly hardcoded contract. Repair commit
`76d1e7b9aaf81d00e5ccc01f43aa778a25fad474` closes both findings without
changing retained Rust source or public package surfaces.

The Cargo member now carries a tracked symlink to the canonical root fixture.
`cargo package` dereferences it into the crate. The package gate unpacked the
result, byte-compared its fixture with the root, and passed all 35 retained
unit tests plus 6 shared-fixture integration tests from the unpacked crate.

The root fixture now drives both languages through their real ID generation,
validation, block-version registry, strategy registry, and media-locator
paths. `effigy qa` passed, including all TypeScript/Svelte/security tests,
Rust format/check/clippy/tests, 20 npm subpaths, 55 npm package files, 22 Cargo
package files, boundaries, version sync, and documentation contracts.
Disposable npm and Cargo consumers both installed the pushed repair commit.

SHA-256 comparison reconfirmed that 11 retained Rust implementation and test
files remain byte-identical to Underlay commit
`7ef7f8e30c3e36fda3a277681405bd5aa5e8703d`. The repair touched no Rust API,
crate manifest, licence, MSRV, lint configuration, Underlay/product code, or
consumer repository.

Fresh no-release checks found no Git tags, GitHub releases, npm registry
package, or crates.io search result. No merge, tag, release, publication, or
consumer edit occurred. The revised PR stops for independent exact-head review.
