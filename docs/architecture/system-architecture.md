# System architecture

## Shape

Nightfire has five layers:

1. **Value and core utilities** define the durable content envelope, block IDs,
   versions, and generic traversal behavior.
2. **Validation and normalization** apply schema-independent save rules without
   loading Svelte.
3. **Registries** hold validators, renderers, and editors behind explicit
   registration. Svelte references here remain type-only.
4. **Adapters** provide Svelte render and edit surfaces. Importing rendering
   must not load editor code or registration side effects.
5. **Proof** covers wire fixtures, exports, dependency boundaries, components,
   sanitization, and package contents.

## Data flow

A consumer supplies a `NightfireValue` and its own registrations. Validation
checks the envelope and registered block versions. Save preparation drops
invalid blocks and assigns missing stable IDs. Rendering resolves registered
renderers and sanitizes untrusted markup before HTML insertion.

Nightfire does not persist content or choose a product schema. Those decisions
remain with the consumer.

## Invariants

- `core` and `validation` have no framework runtime edge.
- Registry imports from Svelte are type-only.
- Renderer graphs contain no editor modules or registration effects.
- Unknown block versions and legacy envelopes fail closed.
- Markdown and embedded HTML cross one sanitizer contract before `{@html}`.
- Wire fixtures are synthetic and contain no production data.

## Reliability and size

Boundary checks inspect source imports and built entry graphs. Package checks
verify the shipped file set and exports. This makes accidental framework,
editor, product, or transitive dependency growth visible before release.

## Change path

Change architecture when ownership or layer boundaries move. Change contracts
when observable guarantees move. Update tests and proof in the same batch.
