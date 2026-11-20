### Fixed

- The schema validator applies a `$ref` target and the keywords beside it,
  instead of dropping the siblings.
- The schema validator accepts array-form `type`, such as
  `["string", "null"]`. An unknown type name fails when the document loads.
- `verify-npm-candidate` refuses an unknown or repeated flag. A typo such as
  `--tag-verison` no longer skips the check it was meant to run.
- `readNpmPublicationAuthority` refuses a `null` or array `npmPublication`
  with the same message as an absent one.
- The colour-literal check no longer names a hyphenated word such as
  `red-pulse`, or a CSS math function such as `tan(45deg)`, as a colour.
- The boundary check strips comments before it reads imports, so a doc-comment
  example cannot trip it. It also checks the root `.` export against Svelte and
  `./strategies`, checks `Cargo.lock` against the forbidden list, and bundles
  the public `validation` and `renderer` entries.
- `run-test-files` exits 1 when a child test process ends without an exit code.
- `check-git-consumer` stops when `git rev-parse HEAD` fails.

### Changed

- `check-renderer-consumer` takes the Svelte version from
  `devDependencies.svelte` and imports the renderer entries through the
  package export map.

### Removed

- `runCargo` in `rust-route.ts`, which had no caller.
- The duplicate `ts/tests/nightfire/validation.test.ts`, which
  `validator-registry.test.ts` covers.

### Consumer migration for 0.6.0

- None. These are repository proof scripts and tests; no package export or
  wire shape changes.
