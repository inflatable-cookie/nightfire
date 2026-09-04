# Contributing

Keep changes generic and narrow. Product behavior belongs in consumer
repositories.

Before opening a pull request:

```sh
bun install --frozen-lockfile
effigy test
effigy qa
```

Add wire fixtures for serialization changes and malicious fixtures for any
markdown, HTML, or URL boundary change. Update `PROVENANCE.md` when extracted
source or boundary adaptations change.

Do not create release tags or publish artifacts as part of an implementation
pull request.
