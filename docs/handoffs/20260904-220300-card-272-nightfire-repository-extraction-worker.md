---
title: Card 272 standalone Nightfire repository extraction worker handoff
kind: northstar-handoff
handoff_mode: worker-pr-loop
worker_mode: implementation
dispatch_authority: orchestrator
handoff: single-file-path-only
status: ready-to-launch
owner: inflatable-cookie/nightfire
created: 2026-09-04
updated: 2026-09-04
handoff_path: docs/handoffs/20260904-220300-card-272-nightfire-repository-extraction-worker.md
base_required: pushed-main
tags: [coordination, handoff, worker, standalone-package, frontier]
---

## Dispatch

Implement Card 272 only in the newly bootstrapped `inflatable-cookie/nightfire`
repository. This is repository bootstrap plus exact TypeScript/Svelte
extraction proof. Do not create a release tag, publish to npm, or edit any
consumer repository.

- Repository: `inflatable-cookie/nightfire`
- Planning base: current `origin/main` at dispatch time
- Worker branch: `worker/card-272-nightfire-repository-extraction`
- Worker worktree: launcher-provided dedicated worktree from `origin/main`
- Required read-only inputs: Underlay `main`, Poodle, Froyo imports, Bovine
  Desktop and Acowtancy dependency inventories
- Capability: high-reasoning TypeScript + Svelte + package/security worker
- Allowed: this repository only, including one root package, extracted generic
  source/tests/fixtures/styles/docs, licence/agent/Effigy guidance, package
  metadata, and one execution log
- Forbidden: edits in Underlay, Market, Froyo, Bovine Desktop, Silo, Farmyard,
  product schemas, Rust crates, product registrations, compatibility facades,
  npm publication, Git tags, or consumer dependency changes

## Authority

Read this handoff and the promoted Card 272/g04.049 planning contracts before
editing. The standalone package is `@inflatable-cookie/nightfire`, consumed by
immutable Git tags later. Card 273 is gated on this Card 272 acceptance plus a
fresh explicit operator approval for `v0.1.0`; Cards 274-276 remain serial
behind it.

Extract only the exact generic Nightfire TypeScript/Svelte behavior from
Underlay. Preserve provenance and the existing wire/fixtures. The root package
must expose only retained generic subpaths for core/types, renderer, editor,
markdown, registries, strategies, validation, and media helpers actually
present in the extracted surface. Core and pure validation stay framework-free;
registry Svelte imports are type-only; renderer-only imports must not load
editor code or registration side effects.

Do not silently hide dependencies. Underlay, SvelteKit, Vite, bits-ui,
lucide-svelte, zod, and smol-toml are forbidden unless direct source evidence
proves an unavoidable retained boundary; if so, stop and escalate rather than
widening the package. Never add product blocks, Acowtancy schemas, or Rust
movement.

## Required proof

Falsify these counterexamples with committed tests and package evidence:

1. An Underlay import or peer dependency survives in the standalone package.
2. A renderer-only consumer loads editor modules or registration side effects.
3. Sanitization works in one environment but fails in browser, SSR, or Tauri.
4. TypeScript and Rust wire fixtures, block ids/versions, registries,
   normalization, validation, or markdown behavior diverge.
5. A transitive framework dependency is merely hidden rather than removed.
6. A Froyo/product-specific block or schema enters the generic repository.
7. A release tag or registry artifact is created.

Prove clean install, typecheck, unit/component tests, export-map boundaries,
pack contents, dependency and bundle evidence, malicious markdown/HTML/URL
fixtures across browser/SSR/Tauri, and consumption from the repository commit
form. Record every retained runtime/peer dependency with a direct reason.
Record installed dependency count/size as evidence only, never as an invented
limit. Do not copy raw answer data or PII.

## Completion

Run the repository's Effigy test plan and focused install/typecheck/test,
browser/SSR/Tauri, fixture-conformance, package, docs, Northstar, format, and
`git diff --check` gates. Record exact commands, hashes, and any blocker in
one dated log. Push one clean implementation PR and stop for independent
exact-head review. If normal PR bootstrap or a required source boundary is
impossible, return the smallest exception without landing implementation.
Never tag, publish, edit consumers, or dispatch Card 273.
