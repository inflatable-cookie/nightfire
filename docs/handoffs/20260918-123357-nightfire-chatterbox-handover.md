# Nightfire Chatterbox handover

Date: 2026-09-18. From the Acowtancy Market/Silo Chatterbox, which is returning to Acowtancy
scope. This records what exists, what was decided, and what cost time — so the incoming authority
starts from facts rather than re-deriving them.

## State, all verified

- **Released.** `@inflatable-cookie/nightfire` 0.1.0 on npm, sha256
  `3301b259486d3f9a5f65e8027ac9e4b66e5e0fc26fe1abc548e5ff16d325197d`, and the Rust crate tagged
  `v0.1.0` — tag only, no crate registry, matching Poodle and Longhorn.
- **Public, with CI.** The repository is public. **GitHub Actions was disabled for this repository at
  the organisation level** — the organisation allows Actions for *selected* repositories, and this one
  was not on the list. That is now enabled, and `ci.yml` runs on main.
- **Release automation, landed.** `release-manifest.json` is the one publication authority;
  `release:npm-admission` refuses a dirty head; `release:npm-archive` packs once and writes the
  candidate identity manifest; `verify-npm-candidate.ts` checks schema, tag version, tag commit, the
  exact package set, every tarball hash and the name inside each tarball; `check-release-automation.ts`
  is a static guard over the workflow's required properties, wired into `qa` and proven to bite;
  `release.yml` runs candidate and publish modes with OIDC trusted publishing and never rebuilds.
- **The publish half is unexercised.** Candidate mode has run green on main. The first real release
  (0.1.1 or 0.2) will exercise publish, and the npm trusted publisher must name
  `.github/workflows/release.yml`.
- **Core vocabulary declared and partly implemented.** `core-blocks.ts` states the six types and, per
  type, which parts exist. `markdown` has editor and renderer; `media` has an editor; `table` and
  `item_list` now have renderers; `rich_text` and `image` have neither yet. The completeness test
  enforces that a declared capability is registered, and was proven to bite.
- `./core-blocks`, `./editor-registrations` and `./render-registrations` are published subpaths. Before
  that the catalogs existed with correct `sideEffects` entries but were absent from the exports map, so
  no consumer could reach them.

## Decisions, in `docs/architecture/core-package-vocabulary.md`

- **Core is** `markdown`, `rich_text`, `table`, `item_list`, `image`, `media`. Generic types are
  unprefixed; profile types are prefixed (`acow.*`, `content.*`, `widget*`). `content.*` is the
  selector family — references into a content library — and is not generic.
- **`item_list` is a container of child blocks.** Decided rather than discovered: `content_list` was
  declared and granted but nothing constructed it, no library held one and no legacy block mapped to
  it, so there was no instance, no producer and no origin. That also made the rename free.
- **`image` and `media` are two types**, not one with a kind. An image carries alt text and sizing; a
  media block is a generalised linkage rendered as a download card.
- **One media-source seam, not block-scoped**: `registerMediaSource({ pick, resolve })`, because the
  rich-text image node consumes it. Poodle's image node is `src`-based and consumer-implemented, which
  is the same seam from the editor side. The existing media block's reference field is `media_id` —
  follow it rather than inventing a second spelling.
- **`rich_text` mirrors Poodle's feature-gated vocabulary** rather than extending it: document,
  paragraph, text, hard break and undo/redo always, plus formatting, headings at the core-declared
  levels, links, lists, blockquote, code block, horizontal rule, tables, and an image node whose whole
  model is `src`, `alt`, `title`. The feature vocabulary is declared in Poodle core.
- **Styling is unresolved and was recorded wrongly here.** The `--nightfire-*` set in
  `ts/src/styles.css` is an **application interface**, not a content concern: 6 of its 23 tokens are
  UI-shaped (`button-chip-padding-block|inline`, `color-field-bg`, `color-danger`, `color-surface`,
  `surface-secondary`), and a markdown, table or list renderer needs none of them. It came across with
  the extraction, since `PROVENANCE.md` traces the values to Underlay's `ts/src/styles.css`, an app
  stylesheet. A contract asserting that this package owns a theme surface was written and then
  removed for that reason. What holds: renderers carry **no scoped styles**, emit
  `data-nightfire-block="<type>"`, **introduce no class of their own**, and retain `underlay-*`
  classes purely as extraction artifacts that are not an integration hook. Where the interface tokens
  belong — the desktop application, a shared design system, or nowhere — is open, and it is the first
  question for whoever takes this over.

## Next, in order

1. **`rich_text`** renderer and editor, wrapping the Poodle rich-text editor.
2. **`image` and `media`** shells plus the `registerMediaSource` seam, wiring the TipTap image node to
   it.
3. **Editors** for `table` and `item_list`, currently renderer-only by declaration.
4. **The identity change.** Core schemas must carry this package's identifiers and be generated and
   published here. Today they carry an Acowtancy-local namespace and are generated by a crate in the
   Acowtancy repository, which is why this package ships **no schemas at all** — the published tarball
   is `ts`, `fixtures`, `package.json`, `README.md`, `LICENSE`, `PROVENANCE.md`. This is a cross-repo
   matter, not a local edit.
5. **Decide where the application interface styling lives.** `ts/src/styles.css` is a desktop-app
   stylesheet swept in by the extraction, along with the `./styles.css` subpath export and the
   `sideEffects` entry for CSS. It does not belong to a generic content package. Removing it touches
   the export map — which `check-exports.ts` asserts in both directions — so it is a change with
   blast radius rather than a file deletion.

## Repository gotchas, each of which cost time

- **The repository's `origin` must be SCP-style, `git@github.com:inflatable-cookie/nightfire.git`.**
  This was recorded the other way round and the correction cost a stalled lane. Northstar Queue parses
  only `https://github.com/<owner>/<repo>` or `git@github.com:<owner>/<repo>`, so an `ssh://` origin
  fails every PR-identity check with "Resolution requires a GitHub origin". The Cargo claim that made
  `ssh://` look necessary is stale: `check:git-consumer:cargo` normalises both forms to HTTPS before
  use, and it passes on the SCP form at `7dd41bb`. The `ssh://` spelling still belongs in a
  **consumer's** `Cargo.toml`, which is what `README.md` shows, and that is a different string from
  this repository's remote. HTTPS pushes are still refused by the OAuth `workflow` scope for files
  under `.github/workflows/`.
- **`release-artifacts/` must stay gitignored.** Untracked certificate output dirties the tree and
  fails the git-consumer proof, so running the certificate would break the gate it serves.
- **The git-consumer proofs need a clean, pushed head.** They install from the pushed commit, so an
  unpushed commit fails them rather than passing vacuously.
- **The export map is a checked contract.** `check-exports.ts` compares it against an explicit
  expectation in both directions, so a new subpath must be declared there.
- **`qa` includes the release-automation guard**; `health` includes the export, boundary and
  version-sync proofs.
- **Every `docs/<dir>` needs an index README.** `docs/policy/` was missing one; it is added.

## Boundary with Acowtancy

Acowtancy consumes this package. Its task `g05.141` moves Farmyard's dependency from
`underlay-nightfire` at underlay `v0.9.8` to the released crate, regenerates the schema set with a
parity proof, and re-points Silo's temporary Market-SHA pin. **Underlay still hosts and publishes a
copy**, with its own crates consuming it internally, so a retirement request is filed in Underlay's
triage rather than being a deletion.

Any change to the core vocabulary or the schema identity needs Silo to follow, because Silo's pin and
consumer mirrors carry the result.
