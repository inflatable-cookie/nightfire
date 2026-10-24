import { afterEach, describe, expect, it } from "../vitest";
import cases from "../fixtures/security/malicious-markdown-v1.json";
import { renderSafeMarkdownPreview } from "../../src/markup/markdown-preview";
import {
  registerRichTextInlineNodeRenderer,
  renderRichTextHtml,
  unregisterRichTextInlineNodeRenderer
} from "../../src/rich-text";

const runtime = process.env.NIGHTFIRE_RUNTIME ?? "ssr";

describe(`markdown sanitization (${runtime})`, () => {
  it("runs in the requested execution environment", () => {
    if (runtime === "ssr") {
      expect(typeof window).toBe("undefined");
      return;
    }
    expect(typeof window).toBe("object");
    if (runtime === "tauri") {
      expect("__TAURI_INTERNALS__" in window).toBe(true);
    }
  });

  for (const fixture of cases) {
    it(`sanitizes ${fixture.name}`, () => {
      const html = renderSafeMarkdownPreview(fixture.input);
      for (const text of fixture.mustContain) expect(html).toContain(text);
      for (const text of fixture.mustNotContain) expect(html.toLowerCase()).not.toContain(text.toLowerCase());
      expect((globalThis as { __nightfirePwned?: boolean }).__nightfirePwned).toBeUndefined();
    });
  }
});

const RICH_TEXT_SCHEMA = "security.rich-text";

afterEach(() => {
  unregisterRichTextInlineNodeRenderer(RICH_TEXT_SCHEMA, "math_inline");
});

function hostileDocument() {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "The value " },
          { type: "math_inline", attrs: { latex: "x^2" } }
        ]
      }
    ]
  };
}

describe(`rich-text sanitization (${runtime})`, () => {
  it("sanitizes hostile registered inline-node output", () => {
    registerRichTextInlineNodeRenderer(RICH_TEXT_SCHEMA, "math_inline", ({ escapeText }) => {
      const marker = "globalThis.__nightfirePwned = true";
      return (
        `<span class="math-inline" onclick="${marker}">${escapeText("x^2")}</span>` +
        `<script>${marker}</script>` +
        `<a href="javascript:${marker}">bad</a>` +
        `<img src="x" onerror="${marker}">`
      );
    });

    const html = renderRichTextHtml(hostileDocument(), { schema: RICH_TEXT_SCHEMA });

    expect(html).toContain('<span class="math-inline">x^2</span>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect((globalThis as { __nightfirePwned?: boolean }).__nightfirePwned).toBeUndefined();
  });
});
