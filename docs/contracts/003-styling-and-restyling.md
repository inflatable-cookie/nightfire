# 003 — Styling and restyling

Status: Active.

## Purpose

This package publishes generic renderers. A renderer a consumer cannot restyle is not generic, it is
merely shared. This contract fixes how the package styles what it renders, and how a consumer changes
it without forking.

## The theme surface

The theme surface is the `--nightfire-*` custom property set in `src/styles.css`. It is public API, in
the same sense as the export map.

1. A new presentational need **adds a token**. It never adds a literal colour, space, radius or size
   in a component.
2. Adding a token is additive. **Renaming or removing a token is breaking.** Consumers' themes
   reference token names, and nothing fails to compile when one moves.

## Styling rules for a renderer

3. A renderer emits semantic markup and **carries no scoped styles**. Scoped styles are exactly what a
   consumer cannot reach, so their absence is what makes the renderer restyleable.
4. A block renderer emits **`data-nightfire-block="<type>"`** on its root, plus data attributes for
   any structural fact a consumer may need to target.
5. **No CSS classes are introduced.** Structure is targeted through data attributes; appearance
   through tokens.

## Data owns content, tokens own appearance

6. A content-presentational fact belongs to the block's data and is emitted as an attribute or as
   explicit alignment — for example which cell edges carry a border, and how a cell is aligned. Its
   *appearance* — colour, thickness, spacing — comes from a token.

   So a consumer restyles without overriding a content decision, and no content decision hard-codes a
   theme value.

## Restyling from a consumer

7. **Theme.** Import the `./styles.css` subpath for defaults, then re-declare any `--nightfire-*` in
   the scope that fits: the document root, a wrapper element, or a theme class. No forking, no build
   step, no component override.
8. **Structure.** Target `[data-nightfire-block="<type>"]` and the data attributes the renderer emits.

## Acceptance for a new block

A renderer is not complete until all three hold: it carries no scoped styles, it emits the
`data-nightfire-block` hook, and every presentational value it uses either comes from the token set or
is added to it in the same change.

## Open decision: token provenance

Not settled, and recorded here rather than left in a conversation.

`PROVENANCE.md` records that `styles.css` carries values derived from Underlay's Nightfire design
tokens, and a token package exists separately at version `0.0.0` and private. So the values are a
**second copy** of a set owned elsewhere: if the original moves, this copy does not know.

The options and what each costs:

- **This package owns its token set.** The names and values here become the authority, the upstream
  relationship is provenance only, and the separate token package is retired or declared unrelated.
  Cost: two packages that both claim to theme Nightfire content stay divergent until one is retired.
- **This package depends on the token package.** There is one source, and consumers get one theme
  surface across packages. Cost: that package must be published and versioned before it can be
  depended on, and its stability becomes this contract's stability.

Until this is decided, a token added here is treated as **locally owned** and recorded as such, rather
than assumed to track another package.
