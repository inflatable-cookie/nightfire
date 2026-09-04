# Contributing

Keep changes generic and narrow. Product behavior belongs in consumer
repositories.

Start with [docs/README.md](docs/README.md). Use Effigy for setup, task
discovery, and validation:

```sh
effigy bootstrap:deps
effigy tasks
effigy test --plan
effigy qa
```

Add wire fixtures for serialization changes and malicious fixtures for any
markdown, HTML, or URL boundary change. Update `PROVENANCE.md` when extracted
source or boundary adaptations change. Update architecture, contracts, and
their indexes in the same change when an observable package rule moves.

Do not create release tags or publish artifacts as part of an implementation
pull request.
