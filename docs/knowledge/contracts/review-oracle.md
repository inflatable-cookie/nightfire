# Review oracle

Operator ruling, 2026-09-18, chosen over building a runnable demo surface.

This package has no application and no demo surface (`effigy --json demo list`
returns zero). A review that requires running a rendered head cannot be
satisfied here. This contract fixes what the oracle is, so a reviewer never has
to infer one and never blocks for want of a surface that does not exist.

## The oracle

1. **Every change's oracle is an implementation or interaction oracle, verified
   inside this repository:** rendered markup, data attributes, stored-data
   round-trips, sanitization results, and interaction paths driven by tests.
2. **Rendered inspection is not a review requirement.** A reviewer must not block
   for want of a running surface. It must also not substitute a guess for a check
   it could not run: an unverifiable oracle is a finding about the oracle, not a
   licence to approve.
3. **Appearance belongs to the consumer** ([styling](styling.md) rule 4). There
   is no design object here for a rendered review to approve and no house
   aesthetic to enforce.
4. **A UI-classified change means an authoring interaction changed**, not that a
   surface must be inspected. Its brief enumerates the interaction paths and
   proves them with tests: keyboard reach and focus order for every structural
   action, the states the brief names, and the transitions between them.
5. **A change that ships editor chrome** is verified at the contract level: no
   scoped styles in a renderer, tokens or overridable defaults rather than
   literals, and no class introduced for a new component.

## What this gives up

For anything a test cannot observe, this is weaker than rendered inspection, and
it cannot judge visual quality at all. That is acceptable because this package
owns no visual language and no consumer-facing surface. It is not a precedent
for a consumer's application, where appearance is the product.

## When this changes

If the operator authorizes a runnable demo surface, this contract is replaced,
not amended: changes that ship appearance then get rendered review, and the
interaction tests stay as the floor.

## Proof

Each brief states its oracle and proves it in-repo. Where a rule is assertable,
a check asserts it: the boundary proof keeps renderers free of editor modules,
the boundary and colour-literal checks keep appearance rules honest, and a
change's interaction oracle lives in its component tests.
