import { describe, expect, it } from "bun:test";

import { renderSafeMarkdownPreview } from "../../src/markup/markdown-preview";

describe("nightfire/markup renderSafeMarkdownPreview", () => {
  it("renders plain markdown to HTML", () => {
    const html = renderSafeMarkdownPreview("# Hello\n\nSome **bold** text.");

    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  // Hostile input (script tags, handlers, javascript: URLs) is covered by the
  // fixture cases in ts/tests/security/sanitization.test.ts.
  it("keeps safe inline HTML", () => {
    const html = renderSafeMarkdownPreview(
      '<em>fine</em> and <a href="https://example.com">link</a>'
    );

    expect(html).toContain("<em>fine</em>");
    expect(html).toContain('href="https://example.com"');
  });
});
