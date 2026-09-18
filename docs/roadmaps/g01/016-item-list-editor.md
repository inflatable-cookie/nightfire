# g01.016 Item List Editor

Owner: repo maintainers
Created: 2026-09-18
Governing refs: `docs/architecture/core-package-vocabulary.md`,
`docs/contracts/003-styling-and-restyling.md`
Depends on: g01.009 — same declaration and catalog files
UI classification: refinement — compact brief below
Ready state: ready

## Outcome

`item_list` becomes authorable: items with an optional title and a body of child blocks, added,
removed and reordered.

## Context

The renderer is complete. The data is `{ title?, intro?, variant?, items: [{ title?, body: <blocks> }] }`,
where each item body carries child Nightfire blocks and renders through its own sub-interface.

The pattern already exists in the package: `ts/src/editor/NightfireMultiBlockItem.svelte` renders a
nested block list, and the field-lifecycle and value-update helpers handle nested changes. So this is
the closest thing to settled work in the generation, which is why it carries a compact brief rather
than a full one.

## Decisions

- **Item editing.** Each item is a title field plus the existing multi-block body editor. Items are
  added, removed and reordered; removal of an item whose body holds content asks first, as elsewhere.
- **Nested blocks render through the registry**, exactly as the renderer does, so a child type the
  consumer registers becomes authorable inside an item without this lane knowing about it.
- **Variant and intro are carried, not invented.** The renderer reads `variant` and `intro`; the editor
  exposes the title and the items, and preserves the rest unchanged rather than rewriting fields it
  does not manage.
- **No new data.** Nothing in the declaration, the catalogs or the renderer changes beyond the `editor`
  flag.

## UI design brief (compact)

- **Classification and workflow:** refinement. The author adds an item, gives it a title, and edits its
  child blocks with the editor that already handles nested blocks.
- **Presentation direction:** the existing field shell and nested-block chrome. No new visual language.
- **States:** no items → the empty state with an add action; an item with a title and no body; a
  deeply nested body; removal of a content-bearing item → confirmation.
- **Scenario oracle:** add two items, title one, put a markdown child block in the other, reorder them,
  save, reload, and confirm the titles, the child block and the order all survive. Then remove the
  content-bearing item and confirm the confirmation appears.

## Acceptance and review oracle

| Invariant | Adversarial counterexample | Required proof |
| --- | --- | --- |
| The declaration and the registration agree | the `item_list` editor flag is true with nothing registered | the self-registration test passes |
| Child blocks are authorable | a registered child type cannot be added inside an item | a test adds a child block and rereads it |
| Unmanaged fields are preserved | `variant` or `intro` is rewritten or dropped | a fixture list carrying both round-trips unchanged |
| Nothing is destroyed silently | removing a content-bearing item loses it | the confirmation path is tested |
| Restyleability holds | the block emits a class or inline appearance | contract 003 rules 1–4 |

## Stop conditions

Stop and report if the existing nested-block editor cannot host child blocks without a change to
shared editor infrastructure, or if preserving `variant` and `intro` requires a data-shape change.

## Evidence

On completion, record: the item controls, the nested-block reuse, the unmanaged-field proof, the
component tests, and the exact `effigy qa` result.
