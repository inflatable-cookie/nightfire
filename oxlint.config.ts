import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "oxlint";

// The Cloudflare shared rule set is the baseline; every entry below is an
// override Nightfire's own contract forces, and each one names that fact.
export default defineConfig({
  ...cloudflare,
  options: {
    ...cloudflare.options,
    // Keep type-aware linting enabled per the ts-toolchain baseline.
    // Published source resolves against `ts/tsconfig.json` (no Bun types);
    // `ts/scripts/tsconfig.json` and `ts/tests/tsconfig.json` extend
    // `ts/tsconfig.tooling.json` so tooling/test files resolve Bun types
    // without leaking them into `ts/src`.
    typeAware: true
  },
  overrides: [
    ...(cloudflare.overrides ?? []),
    {
      // `$state`, `$props`, `$derived` and `$effect` are compiler runes, not
      // globals; svelte-check and the Svelte compiler own them.
      files: ["**/*.svelte"],
      rules: { "no-undef": "off" }
    },
    {
      // Proof scripts report their result to a human or a CI log; that is
      // their output contract.
      files: ["ts/scripts/**/*.ts"],
      rules: { "no-console": "off" }
    },
    {
      // These are the public component and registry boundaries: a host app
      // passes the block object it already holds (Poodle's block type, an API
      // payload), which Nightfire normalises rather than owns. `any` there is
      // the API contract, not an untyped local; narrowing it would break the
      // renderer/editor registration signatures consumers implement.
      files: [
        "ts/src/editor-registry.ts",
        "ts/src/render-registry.ts",
        "ts/src/NightfireEditor.svelte",
        "ts/src/NightfireBlockEditor.svelte",
        "ts/src/editor/NightfireFieldBlockShell.svelte",
        "ts/src/editor/NightfireMultiBlockItem.svelte",
        "ts/tests/fixtures/BlockEditorHarness.svelte",
        "ts/tests/components/VideoEditorHarness.svelte"
      ],
      rules: { "typescript/no-explicit-any": "off" }
    },
    {
      // Test files construct intentionally malformed boundary inputs, test
      // doubles, and JSDOM `querySelector` element casts. `@cloudflare/oxlint-config`
      // already relaxes `no-explicit-any` and `no-unsafe-{assignment,member-access,argument}`
      // for test files; `no-unsafe-type-assertion` is the matching cast rule.
      files: ["ts/tests/**/*.ts"],
      rules: { "typescript/no-unsafe-type-assertion": "off" }
    },
    {
      // Nightfire block data is open JSON by contract: `Record<string, unknown>`
      // at the block boundary is the design, not a missing domain type. The
      // @nkzw quality plugin asks for closed, owner-derived types instead,
      // which inverts the package's generic block model, so its rules stay off
      // here rather than being satisfied with casts.
      files: ["**/*.{ts,svelte}"],
      rules: {
        "@nkzw/no-instanceof": "off",
        "quality/no-array-filter-map": "off",
        "quality/no-chained-type-assertions": "off",
        "quality/no-conditional-empty-object-spread": "off",
        "quality/no-known-value-widening": "off",
        "quality/no-reflect-get": "off",
        "quality/no-unknown-returns": "off",
        "quality/no-unknown-type-aliases": "off",
        "quality/no-unsafe-dictionary-type": "off"
      }
    }
  ]
});
