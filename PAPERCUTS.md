# Papercuts

## Open

## Effigy doctor can resolve a parent workspace dependency before bootstrap

- Friction: with no local `node_modules`, `effigy doctor` ran the health task and
  Bun resolved TypeScript from the parent workspace instead of the pinned
  Nightfire dependency.
- Impact: the boundary proof failed with a misleading API error before
  `effigy bootstrap:deps` restored the local dependency tree.
- Plausible fix: detect missing local bootstrap state before running repository
  health tasks, or isolate dependency resolution to the selected catalog root.
- Surface: Effigy doctor and task execution in standalone child directories.

## Effigy docs context can stall while refreshing a new repository index

- Friction: `effigy docs context` produced no usable result within 30 seconds
  during initial repository bootstrap.
- Impact: authority discovery had to use the committed handoff and direct
  document reads.
- Plausible fix: emit refresh progress and a bounded fallback result when a new
  repository has only a small documentation surface.
- Surface: Effigy documentation graph bootstrap.
