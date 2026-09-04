# Nightfire wire fixtures v1

These fixtures mirror the durable `{ schema, blocks: [{ id, type, version, data }] }`
shape asserted by Underlay Rust tests at source commit
`7ef7f8e30c3e36fda3a277681405bd5aa5e8703d`:

- `rust/crates/underlay-nightfire/src/tests/value_tests.rs`
- `rust/crates/underlay-nightfire/src/tests/block_tests.rs`
- `rust/crates/underlay-nightfire/src/tests/validation_tests.rs`

The standalone tests prove the same empty/single/multi envelopes, UUIDv7-style
block ids, initial versions, supported-version coercion, unknown-version
rejection, and v1 envelope rejection. Rust remains in Underlay.
