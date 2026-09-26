import { describe, expect, it } from "../vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkRepository, colourLiterals, styleBlocks } from "../../scripts/check-style-literals";

// Component styles reference a token and never hold a colour. g01.011's audit
// swept `var(--nightfire-*)` references and could not see the dark literals the
// slash palette wrote directly, so this test asserts the guard bites, the shipped
// tree passes it, the palette's background layers are gone, and the token count
// in `styles.css` still agrees with both documents that state it.

const STYLESHEET = "ts/src/styles.css";
const PALETTE = "ts/src/SlashCommandPalette.svelte";
const MULTI_BLOCK_ITEM = "ts/src/editor/NightfireMultiBlockItem.svelte";

const stylesheet = readFileSync(STYLESHEET, "utf8");
const palette = readFileSync(PALETTE, "utf8");
const multiBlockItem = readFileSync(MULTI_BLOCK_ITEM, "utf8");
const paletteStyles = styleBlocks(palette).join("\n");
const multiBlockItemStyles = styleBlocks(multiBlockItem).join("\n");

function declaredTokens(css: string): string[] {
  return [...css.matchAll(/(--nightfire-[\w-]+)\s*:/g)].map((match) => match[1]!);
}

function tokenValue(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!match) throw new Error(`no declaration for ${name}`);
  return match[1]!.trim();
}

function hexToRgb(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1]!;
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function relativeLuminance([red, green, blue]: [number, number, number]): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

// WCAG 2.x contrast, as the roadmap's measurement uses it. The declared tokens
// are opaque, so no compositing is needed.
function contrast(foreground: string, background: string): number {
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);
  if (!foregroundRgb || !backgroundRgb) {
    throw new Error(`contrast needs opaque hex colours, received ${foreground} on ${background}`);
  }
  const foregroundLuminance = relativeLuminance(foregroundRgb);
  const backgroundLuminance = relativeLuminance(backgroundRgb);
  const [light, dark] =
    foregroundLuminance > backgroundLuminance
      ? [foregroundLuminance, backgroundLuminance]
      : [backgroundLuminance, foregroundLuminance];
  return (light + 0.05) / (dark + 0.05);
}

describe("nightfire/style literals", () => {
  it("bites on a planted colour literal in a style block", () => {
    const planted = `<span></span>\n<style>\n  .probe {\n    color: #ff0000;\n    background: rgb(15 23 42);\n    border-color: rebeccapurple;\n  }\n</style>`;

    const findings = colourLiterals(planted, "planted.svelte");
    expect(findings.map((finding) => finding.literal)).toEqual([
      "#ff0000",
      "rgb(15 23 42)",
      "rebeccapurple",
    ]);
    expect(findings[0]!.line).toBe(4);
    expect(findings[0]!.property).toBe("color");
  });

  it("accepts token references and the non-colour keywords", () => {
    const clean = `<style>\n  .clean {\n    color: var(--nightfire-color-text);\n    background: transparent;\n    border: 1px solid currentColor;\n    font: inherit;\n    fill: url(#icon);\n    background-image: url("#gradient");\n  }\n</style>`;

    expect(colourLiterals(clean, "clean.svelte")).toEqual([]);
  });

  it("passes over every shipped component style block", async () => {
    expect(await checkRepository()).toEqual([]);
  });

  it("makes the palette light chrome that names the text and surface tokens", () => {
    expect(colourLiterals(palette, PALETTE)).toEqual([]);
    expect(paletteStyles).toContain("var(--nightfire-color-surface)");
    expect(paletteStyles).toContain("var(--nightfire-color-text)");
    expect(paletteStyles).toContain("var(--nightfire-color-selection)");
    // The dark gradient and its shadow were the defect; neither survives.
    expect(paletteStyles).not.toMatch(/linear-gradient/);
    expect(paletteStyles).toMatch(
      /\.underlay-nightfire-slash-palette\s*\{[^}]*color:\s*var\(--nightfire-color-text\)/
    );
  });

  it("keeps the danger state on the danger token", () => {
    expect(colourLiterals(multiBlockItem, MULTI_BLOCK_ITEM)).toEqual([]);
    expect(multiBlockItemStyles).toContain("var(--nightfire-color-danger)");
  });

  it("keeps renderers free of tokens and scoped styles", () => {
    const renderers = readdirSync("ts/src", { recursive: true, encoding: "utf8" }).filter(
      (path) => /Renderer\.svelte$/.test(path)
    );
    expect(renderers.length).toBeGreaterThan(0);
    for (const path of renderers) {
      // TableRenderer documents the token namespace in a comment; a comment is
      // not a reference, so the check reads the component without comments.
      const source = readFileSync(join("ts/src", path), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ");
      expect(source, path).not.toContain("--nightfire-");
      expect(source, path).not.toContain("<style");
    }
  });

  it("declares one value per token, all consumed, and the styling contract agrees", () => {
    const declared = declaredTokens(stylesheet);
    expect(declared.length).toBe(25);
    expect(new Set(declared).size).toBe(declared.length);

    const sources = readdirSync("ts/src", { recursive: true, encoding: "utf8" })
      .filter((path) => /\.(ts|svelte)$/.test(path))
      .map((path) => readFileSync(join("ts/src", path), "utf8"))
      .join("\n");
    for (const name of declared) {
      expect(sources, name).toContain(name);
    }

    const stated = readFileSync("docs/knowledge/contracts/styling.md", "utf8").match(
      /(\d+) `--nightfire-\*` values/
    );
    expect(stated).toBeTruthy();
    expect(Number(stated![1])).toBe(declared.length);
  });

  it("keeps the shipped text token legible on the shipped surface", () => {
    expect(
      contrast(
        tokenValue(stylesheet, "--nightfire-color-text"),
        tokenValue(stylesheet, "--nightfire-color-surface")
      )
    ).toBeGreaterThanOrEqual(4.5);
  });
});
