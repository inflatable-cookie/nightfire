# Contributing

Keep changes generic and narrow. Product behavior belongs in consumer
repositories.

Start with [docs/README.md](docs/README.md). Use Effigy for setup, task
discovery, and validation:

```sh
effigy bootstrap:deps
effigy tasks
effigy test --plan
```

Run the targeted checks for what you changed before a pull request; `AGENTS.md`
"Validate" lists them. Full `effigy qa` runs on `main` at release points.

Add wire fixtures for serialization changes and malicious fixtures for any
markdown, HTML, or URL boundary change. Update `PROVENANCE.md` when extracted
source or boundary adaptations change. Update the owning file under
`docs/knowledge/` in the same change when an observable package rule moves.

Do not create release tags or publish artifacts as part of an implementation
pull request.
