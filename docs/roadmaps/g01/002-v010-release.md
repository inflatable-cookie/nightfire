# g01.002 — v0.1.0 release

- Status: Gated
- External authority: Acowtancy Market Card 273
- Gate: explicit operator release confirmation

## Outcome

Create the first immutable Nightfire release from an accepted, clean `main`
revision so Underlay and Froyo can depend on a stable version.

## Work

- Confirm the exact accepted commit and clean worktree.
- Run the release gates declared in `effigy.toml`.
- Confirm changelog and manifest version agreement.
- Create and publish only the artifacts explicitly authorized by the operator.
- Record the immutable version and commit for downstream consumers.

## Acceptance

- The release points at the approved repository state.
- Full package QA passes at that state.
- Tag and package metadata agree.
- Downstream work can pin an immutable release.

## Stop condition

Do not tag or publish from this roadmap entry alone. Stop until the operator
authorizes the release action and destination.
