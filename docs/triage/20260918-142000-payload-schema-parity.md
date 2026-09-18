# Payload schemas are verified against hand-written examples, not the implementation

Recorded 2026-09-18 after g01.010 landed. Unpromoted; not execution authority.

## What is true

`ts/scripts/check-schemas.ts` proves a lot: set equality between the published payload documents and
`CORE_BLOCK_TYPE_NAMES`, JSON Schema 2020-12, relative `$ref`s contained to the tree, no consumer
vocabulary, the shared fixture's positive and negative cases, and one accept/reject example per payload.

But the payload checks are driven by examples written **into the check itself** — for instance the
`image` case is `{ media_id, alt, sizing }`, and every payload gets an unknown-property counterexample.

## Why it matters

A payload document can disagree with the block it describes and stay green, because nothing derives the
property set from the implementation. The first instance is now fixed but it is worth keeping as the
evidence: g01.014 added `title` to a download-card file while
`schemas/blocks/download_card.schema.json` still used `additionalProperties: false` without it, so the
published document rejected a payload the editor writes. It shipped that way, because the check validated
its own example and the lane's pinned handoff told it to touch no shared file. It was corrected in a
follow-up commit, and the example now carries the field.

The general gap is unchanged: the next shape change will do the same thing. The consumer named this exact
failure mode — publishing shapes nothing verifies is what they will not consume. The set-equality guard is
strong; the *content* agreement is not.

## The next check

1. For each core block, compare the document's property set against what its editor and renderer actually
   read and write. Anything the editor writes must be permitted.
2. Then strengthen the check so the comparison is executable rather than manual: add per-block payload
   cases to the shared wire fixture, so the documents are exercised by fixture data the way the envelope
   already is. Note the cross-language cost — the fixture is the shared Rust/TypeScript boundary, so new
   cases must be satisfiable by the Rust implementation or scoped to the TypeScript side deliberately.
3. Keep the unknown-property counterexample; it is the part that stops a document becoming permissive.

## Do not

Do not weaken the set-equality check to make a lane's life easier. A type without its document is the
drift this whole lane exists to prevent. The fix for a lane that adds a type or a field is to update the
document in the same change, which the architecture now states.
