# The schema completeness check can break main for the lane that adds the next block type

Recorded 2026-09-18 while g01.008 closed out. Unpromoted; not execution authority.

## What is true

`g01.010` publishes a payload document for every declared core block type, asserted against
`CORE_BLOCK_TYPE_NAMES`, and the card requires that check to be wired into an existing Effigy selector so
it runs on every lane's `qa`.

That makes the check a **guard in one direction at least**: a declared type without a payload document
fails. It may also guard the other direction — the analogous self-registration test asserts both — which
would mean a payload document for an undeclared type fails too.

`g01.013` adds `video` to the declaration, and it is the last lane in this release that does so.
`g01.010` dispatched before this was noticed, so its dependency could not be moved behind `g01.013`, and
both handoffs are pinned.

## Why it matters

If the check is declared-to-published only, then the moment `g01.013` merges, `qa` fails on `main` for
every lane until a `video` payload document exists — a failure no later lane caused and none of their
handoffs mention.

If it also runs published-to-declared, then adding the `video` document before `g01.013` lands fails just
as hard. One of the two orders is red, and which one depends on a check that does not exist yet.

## The next check, in order

1. When `g01.010`'s pull request is readable, determine the check's direction: declared-to-published
   only, or both.
2. If it is one-directional, add the `video` payload document — pinned shape
   `{ embed: ParsedEmbed, title?, caption? }` — **after** `g01.010` lands and **before** `g01.013` does.
3. If it is bidirectional, the `video` document has to land in the same commit that declares `video`,
   which means `g01.013` carries it or a lane re-lands both together.
4. Either way, verify after the last type-adding lane that the published set covers the final
   declaration, and treat that as a release gate rather than a one-time check.

## Free fix for the future

The durable version is to make the check readable against a *target declaration* rather than the live
one, so a lane that adds a type is told exactly which document to add instead of main going red. That is
a change to the check, not to any published document.
