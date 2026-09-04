# Repository authority map

| Surface | Authority | Nightfire relationship |
| --- | --- | --- |
| Generic TypeScript value, validation, registries, rendering, editing | Nightfire | Owns implementation and release proof |
| Rust wire types | Underlay | Conforms through committed fixtures; does not duplicate Rust |
| Generic UI primitives | Poodle | Consumes released components where justified |
| Product schemas, blocks, registrations, persistence | Froyo and applications | Exposes extension points; does not absorb product policy |
| Cross-repository rollout | Acowtancy Market roadmap g04.049 | Follows release and adoption ordering |

## Rule

A change belongs here only when it remains useful without an Acowtancy product
schema, service, or application runtime. Otherwise it belongs in the consumer.
