# Radii, spacing and font literals still escape the style guard

Recorded 2026-09-18. The colour half was promoted by g01.018 and its diagnosis lives in that card, the
changelog and `ts/scripts/check-style-literals.ts`. This is the remainder.

## What is still open

`ts/scripts/check-style-literals.ts` guards **colour** literals in component style blocks. It does not guard
radii, spacing or font values, so `border-radius: 6px` or `padding: 0.4rem` can still be written directly in
a component and no check sees it.

That is the same blind spot that produced the palette defect one family over: the token audit swept for
`var(--nightfire-*)` references, and a value written directly is invisible to a sweep for references.

## Why it matters

The same argument as colours, one step weaker. A literal value cannot be themed by a consumer and cannot be
changed centrally, so it belongs to the token set or it belongs to a deliberate exception. It matters less
than the colour case because a stray radius is far less likely to make text unreadable — the failure is
inconsistency rather than illegibility.

## The next check

Either extend the guard to the remaining presentational families, or record explicitly that only colours
are guarded and why. Whichever is chosen, make the guard's own name and message say what it covers, so the
next reader does not assume coverage it does not have. `check-style-literals` reads as though it covers all
style literals.

## Do not

Do not assume the guard covers more than it does. Its message names colour; everything else about component
styling is still convention.
