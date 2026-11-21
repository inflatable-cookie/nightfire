### Fixed

- Reject malformed explicit block versions, guard synchronous strategy fetch
  failures, validate version registrations and content checkers, and keep media
  lookup paths on the same nested-block rule.
- Fall back from blank schema default types and cover the shared utilities with
  focused tests.

### Consumer migration for 0.6.0

- None. Existing valid values and APIs are unchanged; malformed inputs now fail
  closed.
