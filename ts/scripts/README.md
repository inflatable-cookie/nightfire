# Scripts

Repository scripts are proof helpers invoked through Effigy.

| Script | Purpose |
| --- | --- |
| `check-boundaries.ts` | Proves dependency, source-graph, and bundle boundaries |
| `check-exports.ts` | Proves declared package exports resolve |
| `check-pack.ts` | Proves the packed package contains the intended files |
| `check-rust-package.ts` | Tests the freshly unpacked Cargo crate and its fixture |
| `check-sanitization.ts` | Exercises malicious markup across supported runtime shapes |
| `check-version-sync.ts` | Proves npm/Cargo version and shared-fixture alignment |
| `check-git-consumer.ts` | Exercises disposable npm and Cargo Git consumers |
| `run-test-files.ts` | Runs selected Bun test files with consistent setup |

Use the matching `effigy` task instead of invoking a script directly unless
debugging the script itself.
