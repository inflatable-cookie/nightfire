import { afterEach, describe, expect, it } from "bun:test";
import cases from "../fixtures/security/malicious-markdown-v1.json";
import { renderSafeMarkdownPreview } from "../../src/markup/markdown-preview";
import { sanitizeEmbedHtml, sanitizeSvgHtml } from "../../src/html";
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
      for (const text of fixture.mustContain) {
        expect(html).toContain(text);
      }
      for (const text of fixture.mustNotContain) {
        expect(html.toLowerCase()).not.toContain(text.toLowerCase());
      }
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

describe(`embed sanitization (${runtime})`, () => {
  it("keeps a provider iframe with its admitted attributes", () => {
    const html = sanitizeEmbedHtml(
      '<iframe src="https://www.youtube.com/embed/x" title="Film" allowfullscreen></iframe>'
    );
    expect(html).toContain('src="https://www.youtube.com/embed/x"');
    expect(html).toContain('title="Film"');
    expect(html).toContain("allowfullscreen");
  });

  it("drops a javascript: source and inline handlers", () => {
    const html = sanitizeEmbedHtml(
      '<iframe src="javascript:globalThis.__nightfirePwned=true" onload="globalThis.__nightfirePwned=true"></iframe>'
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onload");
    expect(html).not.toContain("src=");
  });

  it("drops srcdoc and style, which would carry a document or styling into the page", () => {
    const html = sanitizeEmbedHtml(
      '<iframe srcdoc="<script>alert(1)</script>" style="position:fixed"></iframe>'
    );
    expect(html).not.toContain("srcdoc");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("<script");
  });

  it("removes script and other tags outside the embed allow-list", () => {
    const html = sanitizeEmbedHtml(
      '<iframe src="https://player.vimeo.com/video/1"></iframe><script>alert(1)</script><object data="x"></object>'
    );
    expect(html).toContain("<iframe");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<object");
  });

  it("reduces a whitespace-only or script-only embed to nothing usable", () => {
    expect(sanitizeEmbedHtml("   ").trim()).toBe("");
    expect(sanitizeEmbedHtml("<script>alert(1)</script>").trim()).toBe("");
  });
});

describe(`svg sanitization (${runtime})`, () => {
  it("removes script, event handlers and foreignObject", () => {
    const html = sanitizeSvgHtml(
      '<svg onload="globalThis.__nightfirePwned=true"><script>globalThis.__nightfirePwned=true</script>' +
        '<foreignObject><div>x</div></foreignObject><circle r="1"></circle></svg>'
    );
    expect(html).toContain("<circle");
    expect(html).not.toContain("onload");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("foreignObject");
  });

  it("removes a style element, so an icon cannot restyle the host page", () => {
    const html = sanitizeSvgHtml("<svg><style>body{display:none}</style><rect></rect></svg>");
    expect(html).toContain("<rect");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("display:none");
  });

  it("removes the style attribute, including url() loads and expression()", () => {
    const html = sanitizeSvgHtml(
      '<svg><rect style="background:url(https://evil.example/x.png)"></rect>' +
        '<circle style="x:expression(alert(1))"></circle></svg>'
    );
    expect(html).toContain("<rect");
    expect(html).toContain("<circle");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("evil.example");
  });

  it("removes links and use references that carry javascript: or data: URLs", () => {
    const html = sanitizeSvgHtml(
      '<svg><a href="javascript:globalThis.__nightfirePwned=true"><text>t</text></a>' +
        '<use href="data:image/svg+xml,<svg></svg>"></use></svg>'
    );
    expect(html).toContain("<text");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("href=");
  });

  it("keeps the presentation attributes an icon needs", () => {
    const html = sanitizeSvgHtml(
      '<svg viewBox="0 0 10 10"><path d="M0 0L10 10" fill="none" stroke="red" stroke-width="2"></path></svg>'
    );
    expect(html).toContain('viewBox="0 0 10 10"');
    expect(html).toContain('d="M0 0L10 10"');
    expect(html).toContain('stroke-width="2"');
  });
});
