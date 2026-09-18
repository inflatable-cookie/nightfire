# Handoffs

Handoffs give another thread the minimum context needed for bounded execution.
They do not replace architecture, contracts, or roadmap authority.

## Dispatch handoffs are transport, not history

A handoff submitted to the Queue is a pinned transport artifact. Queue's closeout
hook deletes the exact committed path after the terminal lifecycle record exists,
and it refuses closeout while any durable Markdown still links to that exact path.
Do not list a dispatch handoff under `## Entries`, and do not link one from any
other committed document. Reference the roadmap task instead; Git history and the
lifecycle record keep the handoff's identity.

The entries below are retained documents, not dispatch transports.

## Entries

- [2026-09-18 — Nightfire Chatterbox handover](20260918-123357-nightfire-chatterbox-handover.md)
- [2026-09-04 — Card 272 repository extraction worker](20260904-220300-card-272-nightfire-repository-extraction-worker.md)
