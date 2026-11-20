import { describe, expect, it } from "bun:test";
import { colourLiterals } from "../../scripts/check-colour-literals";

// The guard reads a style block for a colour written directly. A token
// reference names a value; a custom property whose name contains a colour word
// is not a colour, and a colour function that mixes literals is one.

describe("tooling/check-colour-literals", () => {
  it("accepts a token whose name contains a colour word", () => {
    const source = `<style>\n  .probe {\n    color: var(--nightfire-color-red);\n    background: var(--nightfire-color-surface, var(--nightfire-color-red));\n  }\n</style>`;

    expect(colourLiterals(source, "probe.svelte")).toEqual([]);
  });

  it("still bites on a literal fallback inside a token reference", () => {
    const source = `<style>\n  .probe {\n    color: var(--nightfire-color-text, rebeccapurple);\n  }\n</style>`;

    expect(colourLiterals(source, "probe.svelte").map((finding) => finding.literal)).toEqual([
      "rebeccapurple",
    ]);
  });

  it("bites on color-mix() with a literal colour", () => {
    const source = `<style>\n  .probe {\n    background: color-mix(in oklch, #ffffff 40%, transparent);\n  }\n</style>`;

    const findings = colourLiterals(source, "probe.svelte");
    expect(findings.map((finding) => finding.literal)).toEqual(["#ffffff"]);
    expect(findings[0]!.property).toBe("background");
    expect(findings[0]!.line).toBe(3);
  });

  it("ignores hyphenated identifiers and CSS math functions named like colours", () => {
    const source = `<style>\n  .probe {\n    animation: red-pulse 1s;\n    transform: rotate(tan(45deg));\n    color: var(--nightfire-color-tan);\n  }\n</style>`;

    expect(colourLiterals(source, "probe.svelte")).toEqual([]);
  });

  it("still bites on a named colour beside a hyphenated word", () => {
    const source = `<style>\n  .probe {\n    border: 1px solid red;\n  }\n</style>`;

    expect(colourLiterals(source, "probe.svelte").map((finding) => finding.literal)).toEqual([
      "red",
    ]);
  });

  it("accepts color-mix() that mixes tokens only", () => {
    const source = `<style>\n  .probe {\n    background: color-mix(in srgb, var(--nightfire-color-surface) 40%, transparent);\n  }\n</style>`;

    expect(colourLiterals(source, "probe.svelte")).toEqual([]);
  });
});
