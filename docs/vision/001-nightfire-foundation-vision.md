# Nightfire foundation vision

## Long-Term Outcome

Nightfire is the small, stable block-content runtime shared by Acowtancy and
other TypeScript/Svelte consumers. A consumer can render, validate, edit, and
extend Nightfire content without pulling in Underlay or a web application
framework.

## Core Package Behaviors

- Preserve a durable, versioned value envelope.
- Validate and normalize content through framework-free entry points.
- Make renderer and editor capabilities explicit imports.
- Let consumers register product-specific blocks without moving product policy
  into the package.
- Render untrusted markdown and embedded HTML safely across browser, SSR, and
  desktop WebView contexts.
- Keep serialized values conformant with the canonical wire fixtures.

## Strategic Constraints

- Nightfire is a library, not an application framework.
- Underlay owns Rust wire types; Nightfire owns the TypeScript/Svelte runtime.
- Poodle supplies generic UI primitives. Nightfire must not absorb product UI.
- Consumer schemas, persistence, authorization, and application services stay
  with consumers.
- Unknown versions fail closed until an explicit migration contract exists.
- Pre-`1.0` development favors clear breaks over permanent compatibility debt.

## Longer-Term Focus

- Publish immutable releases with reproducible package proof.
- Maintain wire compatibility without restoring an Underlay dependency.
- Let Froyo and desktop consumers adopt Nightfire directly.
- Extend generic block capabilities only when multiple consumers need the same
  stable contract.
