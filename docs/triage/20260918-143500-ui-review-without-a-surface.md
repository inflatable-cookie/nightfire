# A UI-classified lane cannot be reviewed in this repository

Recorded 2026-09-18 when g01.012 blocked at review. Unpromoted; not execution authority. Needs an
operator decision because it gates a lane that is in the next release.

## What happened

g01.012's handoff carried a compact UI brief, so the reviewer applied the UI review route. That route
requires running the exact head and exercising the oracle across states, keyboard paths and viewports.
The reviewer verified everything verifiable — exact head, clean worktree, `effigy health`, serial
`effigy qa`, PR CI — and then blocked with a precise and correct reason: this repository has no runnable
product or demo surface. `effigy --json demo list` returns zero, and the reviewer rejected jsdom
component tests as a substitute for rendered inspection. It classified its own block as a
review-capability blocker rather than a source failure, which is the right call.

Part of that was my misclassification: the image block emits no appearance at all, so the UI route should
never have applied. That is corrected in the card. But the correction does not close the gap, because:

## The gap is real for g01.009

The table editor is **genuinely** a UI lane. It introduces an authoring interaction — a grid, a keyboard
model, structural actions, a confirmation path — and it is in the next release. Under the UI route as
written, it cannot be reviewed either, for the same reason: there is nothing to run.

So the release currently depends on a review the repository cannot perform.

## Two resolutions

**A — Provide a runnable demo surface.** An Effigy demo that serves the editor at an exact head, so a
reviewer can check out the PR head, drive the scenario, and inspect it. Paseo's browser tools
(navigate, click, type, screenshot, evaluate) make the inspection half possible once a surface exists.

Cost: a demo app in a package that ships no app, plus a declared Effigy demo, plus the discipline that it
runs at the reviewed head rather than at main. It also becomes standing infrastructure that every future
UI lane depends on, which is good if UI lanes are going to keep arriving and bad if this is the last one.

**B — Narrow the UI route for this repository, deliberately and in writing.** Nightfire owns no rendered
surface: renderers emit semantic markup and data attributes, and contract 003 rule 4 leaves appearance
entirely to the consumer. So UI classification applies only to a lane that ships appearance of its own —
and no lane in this generation does. Every other interaction is reviewed through in-repo interaction
tests that drive the paths and assert the results, with the oracle written as an implementation oracle
rather than a rendered one.

Cost: a genuine reduction in review strength for interaction behaviour. It is defensible here because the
visual judgement belongs to the consumer, but it must be recorded as the accepted oracle rather than
implied, and it must not be used to wave through a lane that does ship appearance.

**Recommendation:** B now, recorded in the contract or architecture, because it matches what this package
actually is and it unblocks the release without new infrastructure. Add A only if the operator wants
rendered inspection as a standing capability — it is the stronger review and worth having if UI lanes
keep arriving.

## The next check, in order

1. Operator decides A, B, or both.
2. Whatever is decided is recorded where the next reviewer will read it — not in a card, because the
   reviewer reads the handoff and the contract, and the classification is currently made per lane.
3. g01.009's oracle is written to match, before it reaches review.
4. g01.012 is unblocked by whichever route is chosen, or explicitly superseded if the pinned handoff's
   brief cannot be corrected in place.

## Do not

Do not treat the reviewer as wrong. It followed the route that was specified, verified everything it
could, and refused to imply an approval it had not earned. The classification was wrong, and the route
has no answer for a repository with no surface.
