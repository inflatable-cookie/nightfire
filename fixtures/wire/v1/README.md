# Nightfire wire fixtures v1

These fixtures mirror the durable `{ schema, blocks: [{ id, type, version, data }] }`
shape asserted by Underlay Rust tests at source commit
`7ef7f8e30c3e36fda3a277681405bd5aa5e8703d`:

- `rust/nightfire/src/tests/value_tests.rs`
- `rust/nightfire/src/tests/block_tests.rs`
- `rust/nightfire/src/tests/validation_tests.rs`

The standalone TypeScript and Rust tests consume `nightfire-values.json`
directly. They prove the same empty/single/multi envelopes, UUIDv7-style block
ids, initial versions, supported-version coercion, unknown-version rejection,
v1 envelope rejection, strategy and registry lookup, structural validation,
and media-locator resolution.

`rust/nightfire/fixtures/wire/v1/nightfire-values.json` is a tracked symlink to
this file. Cargo dereferences it into the `.crate`, so an unpacked package keeps
the fixture needed by its integration test without creating a second authored
fixture source.
