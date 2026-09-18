# 004 — Review oracle

Status: Active. Operator decision, 2026-09-18.

## Purpose

This package has no application and no demo surface: `effigy --json demo list` returns zero. A review
route that requires running a rendered exact head therefore cannot be satisfied here, and a lane
classified as UI work blocked on exactly that — a reviewer with a green head, green `effigy qa` and green
CI, refusing to imply an approval it could not verify.

This contract fixes what a review oracle is in this repository, so a reviewer never has to infer one, and
so no reviewer has to block for want of a surface that does not exist and will not be built.

## The oracle

1. **Every lane's oracle is an implementation or interaction oracle, verified inside this repository:**
   rendered markup, data attributes, stored-data round-trips, sanitization results, and interaction paths
   driven by tests.

2. **Rendered inspection is not a review requirement.** A reviewer must not block for want of a running
   surface. It must also not substitute a guess for a check it could not run — if the oracle is
   unverifiable, that is a finding about the oracle, not a licence to approve.

3. **Appearance belongs to the consumer.** Contract 003 rule 4: a renderer carries no appearance at all,
   and the editor chrome ships overridable defaults. There is therefore no design object in this
   repository for a rendered review to approve, and no house aesthetic for it to enforce.

4. **`UI classification` in a handoff means an authoring interaction changed** — not that a surface must
   be inspected. A lane so classified enumerates its interaction paths in its brief and proves them with
   tests: keyboard reach and focus order for every structural action, the states its brief names, and the
   transitions between them.

5. **A lane that ships chrome of its own** — an editor surface rather than a renderer — is still verified
   at the contract level: no scoped styles in a renderer, tokens or overridable defaults rather than
   literals in the appearance it ships, and no class introduced for a new component.

## What this gives up

Do not pretend otherwise. For anything a test cannot observe, this is a weaker oracle than rendered
inspection, and it cannot judge visual quality at all. That is acceptable because this package owns no
visual language and no consumer-facing surface; it is not a precedent for a consumer's application, where
appearance is the product.

## When this changes

If the operator authorises a runnable demo surface, this contract is **replaced rather than amended**:
lanes that ship appearance then get the rendered review, and the interaction tests stay as the floor.

## Proof

Each lane states its oracle in its brief and proves it inside the repository. Where a rule above is
assertable by a check, it is asserted rather than described: the boundary proof keeps renderers free of
editor modules, the boundary and token checks keep appearance rules honest, and a lane's interaction
oracle lives in its own component tests.
