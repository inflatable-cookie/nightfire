### Changed

- Runtime dependency `isomorphic-dompurify` `4.9.0` (was `3.23.0`). Upstream
  `4.0.0` only re-marks the Node floor that `3.20.0` already raised, so the
  sanitizer contract and output are unchanged. DOMPurify resolves to `3.5.0`.
- Dev tools: `jsdom` `31.0.1`, `@cloudflare/oxlint-config` `0.2.0`, `oxfmt`
  `0.80.0`, `typescript` `6.0.3`, Bun `1.4.5` (`packageManager`, CI and
  `@types/bun`). `tsrs` is now an explicit devDependency, because
  `@cloudflare/oxlint-config` `0.2.0` makes it an optional peer.

### Consumer migration

- None.
