import { describe, expect, it } from "../vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The rich-text block wraps Poodle; it does not re-declare the vocabulary. This
// test is the adversarial half of that claim: it fails if a local node, mark,
// feature set, schema, or toolbar appears under the implementation directory.

const directory = "ts/src/rich-text";
const files = readdirSync(directory).filter((name) => /\.(ts|svelte)$/.test(name));
const sources = Object.fromEntries(
  files.map((name) => [name, readFileSync(join(directory, name), "utf8")])
);
const allSources = Object.values(sources).join("\n");

describe("nightfire/rich-text vocabulary", () => {
  it("wraps Poodle's published components and pins Poodle's exported feature set", () => {
    for (const file of ["RichTextEditor.svelte", "RichTextRenderer.svelte"]) {
      expect(sources[file], file).toContain("@inflatable-cookie/poodle-svelte/rich-text");
      expect(sources[file], file).toContain("RICH_TEXT_FEATURES");
    }
    expect(sources["render.ts"]).toContain('registerBlockRenderer(null, "rich_text"');
    expect(sources["editor.ts"]).toContain('registerBlockEditor(null, "rich_text"');
  });

  it("declares no local node, mark, schema, feature set, or toolbar", () => {
    const forbidden = [
      /Extension\.create/,
      /Node\.create/,
      /\bMark\.create/,
      /new Schema\(/,
      /addCommands/,
      /addNodeView/,
      /RichTextFeature\[\]\s*=/,
      /toolbar\s*=\s*\[/
    ];
    for (const pattern of forbidden) {
      expect(allSources).not.toMatch(pattern);
    }
  });

  it("carries no scoped styles, class, or token dependency", () => {
    expect(sources["RichTextRenderer.svelte"]).not.toContain("<style");
    expect(sources["RichTextRenderer.svelte"]).toContain('data-nightfire-block="rich_text"');
    expect(allSources).not.toContain("--nightfire-");
  });
});
