# Papercuts

## Open

## Effigy doctor can resolve a parent workspace dependency before bootstrap

- Friction: with no local `node_modules`, `effigy doctor` ran the health task and
  Bun resolved TypeScript from the parent workspace instead of the pinned
  Nightfire dependency.
- Impact: the boundary proof failed with a misleading API error before
  `effigy bootstrap:deps` restored the local dependency tree.
- Plausible fix: detect missing local bootstrap state before running repository
  health tasks, or isolate dependency resolution to the selected catalog root.
- Surface: Effigy doctor and task execution in standalone child directories.

## Effigy docs context can stall while refreshing a new repository index

- Friction: `effigy docs context` produced no usable result within 30 seconds
  during initial repository bootstrap.
- Impact: authority discovery had to use the committed handoff and direct
  document reads.
- Plausible fix: emit refresh progress and a bounded fallback result when a new
  repository has only a small documentation surface.
- Surface: Effigy documentation graph bootstrap.

## Several threads writing one shared checkout sweep each other's working tree

- Friction: a planning pass ran in `/Users/tom/Dev/projects/nightfire` while
  another thread was still landing commits there. Twice, a commit from the other
  thread folded in this pass's uncommitted files, and one contract the other
  thread owned was written, removed, and restored inside ten minutes, so
  citations written against the first revision were wrong twice within the hour.
- Impact: planning text was rewritten three times to track a moving authority, a
  handoff could not be submitted until that authority settled, and reviewer
  attention went to reconciliation rather than to the plan.
- Plausible fix: give a planning authority a checkout it owns for the duration of
  a planning pass, or have the other thread stop writing the repository before
  the planning commit is staged.
- Surface: shared integration checkout; more than one thread planning one
  repository.

## Queue rejects GitHub's canonical ssh:// origin form

- Friction: Northstar Queue's GitHub resolver accepts
  `https://github.com/<owner>/<repo>` and `git@github.com:<owner>/<repo>` but not
  `ssh://git@github.com/<owner>/<repo>`. That third form is what a Cargo git
  dependency needs, and this repository used it. Every PR-identity check failed
  with "Resolution requires a GitHub origin".
- Impact: a finished, QA-green lane sat in `working` with attention raised; the
  recovery path then tried `resume_worker` on a healthy idle worker and produced a
  second, misleading error ("Pre-PR worker resume requires a blocked result or
  stopped pre-callback worker").
- Plausible fix: widen the resolver to the third legal GitHub spelling in
  `server/forge.ts` and `server/git.ts`, and record the accepted forms.
- Surface: Northstar Queue forge and PR resolution; any repository whose `origin`
  is an `ssh://` URL.

## The changelog format that docs QA accepts is not the one the release parser accepts

- Friction: `## [0.1.0] — 2026-09-18` passed `effigy qa:docs` and broke
  `effigy release status` with `changelog parse errors: unexpected content in
  category`. The em dash is the only difference from the accepted form.
- Impact: the repository looked release-ready while the release tool refused to
  read its changelog at all.
- Plausible fix: have `qa` run the changelog parser the release path uses, or
  accept both separators.
- Surface: Effigy changelog parsing; `qa:docs` coverage.

## Effigy proposes a patch bump for a release with breaking changes

- Friction: `effigy release simulate` planned `0.1.1` for a release whose real
  content is breaking: a retired block type and a removed export subpath. It
  derives the bump from commit prefixes and changelog categories, and this
  repository's history carries no breaking marker.
- Impact: the default would produce a version that `^0.1.0` consumers silently
  accept, which is the opposite of what a breaking change needs. The release has
  to be prepared with an explicit `--version`, and someone has to know that.
- Plausible fix: recognise a `### Removed` category as at least minor under
  `pre-1-0 = true`, or warn when a release includes a removed category and the
  computed bump is a patch.
- Surface: Effigy `release prepare` version selection; `pre-1-0` handling.
