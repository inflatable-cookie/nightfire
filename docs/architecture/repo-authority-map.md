# Repository authority map

| Surface | Authority | Nightfire relationship |
| --- | --- | --- |
| Generic Rust protocol, strategies, registries, validation, hashing, IDs, locators | Nightfire | Owns crate `nightfire` and release proof |
| Generic TypeScript value, validation, registries, rendering, editing | Nightfire | Owns npm package and release proof |
| Generic UI primitives | Poodle | Consumes released components where justified |
| Product schemas, blocks, registrations, persistence | Froyo and applications | Exposes extension points; does not absorb product policy |
| Underlay media traversal and HTTP adapters | Underlay | Consumes Nightfire; remains outside the generic repository |
| Cross-repository rollout | Acowtancy Market roadmap g04.049 | Card 278 corrects the TS-only extraction before release |

## Rule

A change belongs here only when it remains useful without an Acowtancy product
schema, service, or application runtime. Otherwise it belongs in the consumer.
