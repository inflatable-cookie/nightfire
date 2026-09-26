# Vision

Nightfire is the small, stable block-content system shared by Rust and
TypeScript/Svelte consumers. A consumer can model, validate, render, edit, and
extend Nightfire content without pulling in Underlay or a web application
framework.

## What it does

- Preserves a durable, versioned value envelope.
- Exposes matching Rust and TypeScript protocol, registry, strategy, version,
  validation, block-ID, hashing, and media-locator behavior.
- Validates and normalizes content through framework-free entry points.
- Makes renderer and editor capabilities explicit imports.
- Lets consumers register product-specific blocks without moving product policy
  into the package.
- Renders untrusted markdown and embedded HTML safely across browser, SSR, and
  desktop WebView contexts.
- Keeps serialized values conformant with the canonical wire fixtures.

## Success

- Immutable releases with reproducible package proof.
- Cross-language wire and behavioral compatibility without an Underlay
  dependency.
- Froyo and desktop consumers adopt Nightfire directly.
- Generic block capabilities grow only when multiple consumers need the same
  stable contract.

## Not this

- Not an application framework.
- Not a home for product UI. Poodle supplies generic UI primitives.
- Not the owner of consumer schemas, persistence, authorization, or application
  services.
- Not a migrator: unknown versions fail closed until an explicit migration
  contract exists.
- Not a compatibility layer: before `1.0`, clear breaks beat permanent
  compatibility debt.
