import { describe, expect, it } from "../vitest";
import { renderRichTextDocumentHtml } from "../../src/rich-text/render-document";

const fixtureDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Title" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hello",
          marks: [{ type: "bold" }],
        },
      ],
    },
  ],
};

const vocabularyDocument = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " " },
        { type: "text", text: "em", marks: [{ type: "italic" }] },
        { type: "text", text: " " },
        { type: "text", text: "strike", marks: [{ type: "strike" }] },
        { type: "text", text: " " },
        { type: "text", text: "code", marks: [{ type: "code" }] },
        { type: "text", text: " " },
        {
          type: "text",
          text: "link",
          marks: [{ type: "link", attrs: { href: "https://x.test" } }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }],
        },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 3 },
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Three" }] }],
        },
      ],
    },
    {
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Quote" }] }],
    },
    {
      type: "codeBlock",
      attrs: { language: "js" },
      content: [{ type: "text", text: "const x = 1;" }],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "line" },
        { type: "hardBreak" },
        { type: "text", text: "break" },
      ],
    },
    {
      type: "image",
      attrs: { src: "https://x.test/a.png", alt: "Logo", title: "Mark" },
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "H" }] }],
            },
            {
              type: "tableCell",
              attrs: { colspan: 2 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "C" }] }],
            },
          ],
        },
      ],
    },
  ],
};

describe("nightfire/rich-text document HTML", () => {
  it("serializes the committed rich-text fixture", () => {
    expect(renderRichTextDocumentHtml(fixtureDocument)).toBe(
      "<h2>Title</h2><p><strong>Hello</strong></p>"
    );
  });

  it("serializes every admitted node and mark", () => {
    const html = renderRichTextDocumentHtml(vocabularyDocument);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>em</em>");
    expect(html).toContain("<s>strike</s>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain('<a href="https://x.test">link</a>');
    expect(html).toContain("<ul><li><p>One</p></li></ul>");
    expect(html).toContain('<ol start="3"><li><p>Three</p></li></ol>');
    expect(html).toContain("<blockquote><p>Quote</p></blockquote>");
    expect(html).toContain('<pre><code class="language-js">const x = 1;</code></pre>');
    expect(html).toContain("<hr>");
    expect(html).toContain("line<br>break");
    expect(html).toContain('<img src="https://x.test/a.png" alt="Logo" title="Mark">');
    expect(html).toContain(
      "<table><tbody><tr><th><p>H</p></th><td colspan=\"2\"><p>C</p></td></tr></tbody></table>"
    );
  });

  it("escapes text and drops executable URLs", () => {
    const html = renderRichTextDocumentHtml({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "<script>evil()</script>" },
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
        {
          type: "image",
          attrs: { src: "javascript:alert(1)", alt: "x" },
        },
      ],
    });
    expect(html).toContain("&lt;script&gt;evil()&lt;/script&gt;");
    expect(html).toContain("click");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
  });

  it("refuses a non-document", () => {
    expect(renderRichTextDocumentHtml(null)).toBe("");
    expect(renderRichTextDocumentHtml({ type: "paragraph" })).toBe("");
  });
});
