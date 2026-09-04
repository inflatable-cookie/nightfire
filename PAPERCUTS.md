# Papercuts

## Effigy docs context can stall while refreshing a new repository index

- Friction: `effigy docs context` produced no usable result within 30 seconds
  during initial repository bootstrap.
- Impact: authority discovery had to use the committed handoff and direct
  document reads.
- Plausible fix: emit refresh progress and a bounded fallback result when a new
  repository has only a small documentation surface.
- Surface: Effigy documentation graph bootstrap.
