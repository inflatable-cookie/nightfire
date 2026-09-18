# g01.010 Publish Core Schemas

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/002-package-boundary.md`
Depends on: g01.008 — both edit `package.json`
Ready state: ready — the consumer requirement is settled by the Market/Silo Chatterbox consultation
of 2026-09-18

## Outcome

Nightfire publishes JSON Schema documents for its own value, block, registry and strategy mechanics and
for the block payloads it owns, under its own identifiers, shipped in the release and proven against the
implementation. A consumer stops generating the generic files and byte-pins ours instead.

## Source

The consumer-side requirement was measured on the Acowtancy tree after its g05.141 and delivered by the
Market/Silo Chatterbox, operator-authorized. Its follow-on placeholder is
`docs/roadmaps/g05/141-consume-the-released-nightfire-package.md`, section "Follow-on, deliberately not
bundled", in the Acowtancy repository — cite that until it compiles a successor task. Do not block on a
Market card number.

## What the consumer needs

**Mechanics, not product.** They want the generic mechanics plus the core block payloads Nightfire owns.
They explicitly do **not** want a generator for their product strategies, and they do not want
`acow:content/rich_text` or any other product strategy schema, question/answer payloads, widget
vocabulary, spreadsheet core, field profiles, document kinds, publishing enums, or media-descriptor
data. Those stay Silo, and their strategy documents `allOf` the generic envelope and then add
`schema: { const: "acow:content/rich_text" }` plus their allowed block types.

**The artifact list:**

| Document | Note |
| --- | --- |
| Value envelope mechanics | `{ schema, blocks }`, deny-unknown. **`schema` must be a string or an open pattern, not an enum of consumer ids.** Their current `envelope.schema.json` mixes the mechanics with an `enum` of eight `acow:*` ids; that enum is theirs. |
| Block wrapper | `{ id, type, version, data }`. |
| Registry mechanics | `nightfire.registry@1` — mechanics only. |
| Strategy mechanics | `nightfire.strategy@1` — mechanics only, and it **must not enumerate** their eight strategy ids. |
| Core block payloads | `image`, `download_card`, `markdown`, `rich_text`, `table`, `item_list`, `video` — whatever this release makes core. They byte-pin these and stop authoring them. |

**Identifiers.** `nightfire.value@1`, `nightfire.block@1`, `nightfire.registry@1`, `nightfire.strategy@1`
are accepted. Constraints:

- The wire `schema` field on a value **stays the consumer's** (`acow:content/rich_text`, underscore and
  colon). Do not rename it.
- No `acow:` or `silo.` prefix in a Nightfire `$id`.
- Do **not** preserve the Farmyard residue `https://acowtancy.local/farmyard/nightfire/envelope.schema.json`.
  Their `$id`s will change on consume and their digest will move; that is expected on a pin bump.
- Digest-locked mirrors key **files and relative `$ref`s**, not `$id`s. Keep file names stable, keep the
  tree relatively referenceable, and stay JSON Schema 2020-12.

**Consumption.** Build-time copy into a self-contained, offline-resolvable tree. No runtime import and no
live `$id` fetch — a network `$ref` or an npm import at validation time fails their Desktop offline gate.
They copy the bytes from the release, prove digest equality with the tagged files, and their documents
`$ref` ours by relative path. Their `/raw/envelope.schema.json` is referenced as `../envelope.schema.json`.

**Ordering.** The schemas must exist **in the tagged release** before they repin. They will not pin a
release without schemas and follow. Their chain after our tag is: Nightfire release → Underlay swap onto
that release → Silo/Farmyard pin, drop the `underlay-nightfire` bridges, rebuild the core+acowtancy
amalgam.

## The parity proof

They named the failure they will not consume: publishing shapes that nothing verifies. The proof is
executable rather than declarative, and it reuses the boundary the two languages already share:

1. **Completeness.** Every declared core block type has a payload schema, asserted against
   `CORE_BLOCK_TYPE_NAMES`, so a new core block cannot ship without one.
2. **Conformance.** Every positive wire fixture validates against the published documents and every
   negative fixture is rejected.
3. **Cross-language agreement.** The Rust side already validates the same shared wire fixtures, so the
   published documents and both implementations agree at the one boundary they share.
4. **Pack completeness.** The schema files are required files in the pack proof, so a release cannot ship
   without them.

Schemas are hand-authored and verified, not generated. Generating them would need a new dependency, and
the conformance proof above is the thing the consumer actually asked for.

## Scope disagreements to settle on consume

Two divergences between this release and the inventory the consultation measured, both of which the
consumer must reconcile rather than dual-publish:

- **`media` is retired in this release.** Their list still includes it. Its replacement is
  `download_card` for library files, `image` for a single library image, and `video` for embeds. Do not
  expect a `media` payload.
- **`image` is reference-based**, not URL-based: `{ media_id, alt?, title?, caption?, sizing? }`, where
  `sizing` is one of `small | medium | large | full`. They described `image` as an ownership transfer they
  will accept; if the payload Silo authors today uses a different reference field, the transfer is a
  payload migration on their side rather than a drop-in replacement.

## Work

1. Author the documents under `schemas/`, JSON Schema 2020-12, file names and relative `$ref`s stable.
2. Add `schemas/` to `package.json` `files` and to the required list in `ts/scripts/check-pack.ts`.
3. Add the completeness check against the declaration, and the positive and negative fixture conformance
   checks.
4. Record the accepted identifiers in the architecture document, including what must not appear in them.
5. Add the lane to the release gates and confirm it lands before the tag, because the consumer repins
   from the tag rather than following.
6. Record the consumer follow-up once Market compiles it.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The documents describe the implementation | a schema accepts a payload the implementation rejects | positive and negative fixtures agree with both implementations |
| Nothing product leaks in | a strategy id or a question payload schema is published | no `acow:` or `silo.` string and no strategy enum appears in `schemas/` |
| The envelope is generic | `schema` is an enum of consumer ids | `schema` is a string or an open pattern, and the consumer's own enum is absent |
| Every core block is covered | a declared block type has no payload schema | the completeness check fails |
| The release carries them | the schemas exist in the repo but not in the tarball | the pack proof requires them |
| They resolve offline | a document needs a network `$ref` or a runtime import | every `$ref` is relative and inside the tree |

## Stop conditions

Stop and report if the envelope cannot be expressed without the consumer's strategy ids, if a core block
payload cannot be described without leaking product vocabulary, if the parity proof cannot be made
executable, or if the lane cannot land before the tag. Do not publish a schema the implementation does
not satisfy, and do not take over the consumer's generator.

## Evidence

On completion, record: the published file set, the identifiers, the parity proof results, the pack proof
including the schemas, and the release tag the consumer pins.
