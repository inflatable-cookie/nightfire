import { afterEach, describe, expect, it } from "../vitest";
import {
  getRichTextInlineNodeRenderer,
  registerRichTextInlineNodeRenderer,
  renderRichTextHtml,
  unregisterRichTextInlineNodeRenderer,
  type RichTextInlineNodeRenderer
} from "../../src/rich-text";

const SCHEMA_A = "test.schema-a";
const SCHEMA_B = "test.schema-b";

const registered: Array<[string, string]> = [];

function register(
  schema: string,
  type: string,
  renderer: RichTextInlineNodeRenderer
): void {
  registerRichTextInlineNodeRenderer(schema, type, renderer);
  registered.push([schema, type]);
}

function paragraphWith(...content: unknown[]) {
  return { type: "doc", content: [{ type: "paragraph", content }] };
}

function mathNode(attrs: Record<string, unknown> = { latex: "x^2" }) {
  return { type: "math_inline", attrs };
}

function latexRenderer(): RichTextInlineNodeRenderer {
  return ({ node, escapeText, escapeAttribute }) => {
    const latex = String(node.attrs.latex ?? "");
    return (
      `<span class="math-inline" data-latex="${escapeAttribute(latex)}">` +
      `${escapeText(latex)}</span>`
    );
  };
}

afterEach(() => {
  for (const [schema, type] of registered.splice(0)) {
    unregisterRichTextInlineNodeRenderer(schema, type);
  }
});

describe("nightfire/rich-text inline node renderers", () => {
  it("renders a registered custom node within surrounding sentence text", () => {
    register(SCHEMA_A, "math_inline", latexRenderer());

    const html = renderRichTextHtml(
      paragraphWith(
        { type: "text", text: "The value " },
        mathNode(),
        { type: "text", text: " is small." }
      ),
      { schema: SCHEMA_A }
    );

    expect(html).toBe(
      '<p>The value <span class="math-inline" data-latex="x^2">x^2</span> is small.</p>'
    );
  });

  it("keeps a registration inside its own schema", () => {
    register(SCHEMA_A, "math_inline", latexRenderer());
    const document = paragraphWith({ type: "text", text: "See " }, mathNode());

    const schemaA = renderRichTextHtml(document, { schema: SCHEMA_A });
    const schemaB = renderRichTextHtml(document, { schema: SCHEMA_B });
    const noSchema = renderRichTextHtml(document);

    expect(schemaA).toContain('class="math-inline"');
    expect(getRichTextInlineNodeRenderer(SCHEMA_B, "math_inline")).toBeNull();
    for (const html of [schemaB, noSchema]) {
      expect(html).toContain("math_inline");
      expect(html).not.toContain("math-inline");
      expect(html).toContain('data-nightfire-inline-fallback="unregistered"');
    }
  });

  it("shows a deterministic escaped fallback for an unregistered leaf", () => {
    const html = renderRichTextHtml(paragraphWith(mathNode()), { schema: SCHEMA_A });

    expect(html).toBe(
      '<p><span data-nightfire-inline-node="math_inline"' +
        ' data-nightfire-inline-fallback="unregistered">math_inline</span></p>'
    );
  });

  it("keeps the children of an unregistered container", () => {
    const html = renderRichTextHtml(
      paragraphWith({
        type: "custom_wrapper",
        content: [{ type: "text", text: "kept" }]
      }),
      { schema: SCHEMA_A }
    );

    expect(html).toBe("<p>kept</p>");
    expect(html).not.toContain("nightfire-inline-fallback");
  });

  it("hands attributes and rendered children to a registered container renderer", () => {
    let seen: { attrs: unknown; childrenHtml: string; schema: string } | null = null;
    register(SCHEMA_A, "callout", ({ node, childrenHtml, schema }) => {
      seen = { attrs: node.attrs, childrenHtml, schema };
      return `<aside data-tone="${String(node.attrs.tone)}">${childrenHtml}</aside>`;
    });

    const html = renderRichTextHtml(
      {
        type: "doc",
        content: [
          {
            type: "callout",
            attrs: { tone: "warn" },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Careful" }] }
            ]
          }
        ]
      },
      { schema: SCHEMA_A }
    );

    expect(seen).toEqual({
      attrs: { tone: "warn" },
      childrenHtml: "<p>Careful</p>",
      schema: SCHEMA_A
    });
    expect(html).toBe('<aside data-tone="warn"><p>Careful</p></aside>');
  });

  it("composes supported marks around registered output", () => {
    register(SCHEMA_A, "math_inline", latexRenderer());

    const bold = renderRichTextHtml(
      paragraphWith({ ...mathNode(), marks: [{ type: "bold" }] }),
      { schema: SCHEMA_A }
    );
    const linked = renderRichTextHtml(
      paragraphWith({
        ...mathNode(),
        marks: [{ type: "link", attrs: { href: "https://example.test/maths" } }]
      }),
      { schema: SCHEMA_A }
    );

    expect(bold).toBe(
      '<p><strong><span class="math-inline" data-latex="x^2">x^2</span></strong></p>'
    );
    expect(linked).toContain('<a href="https://example.test/maths">');
    expect(linked).toContain('class="math-inline"');
  });

  it("falls back visibly when a registered renderer fails", () => {
    register(SCHEMA_A, "math_inline", () => {
      throw new Error("consumer renderer exploded");
    });
    register(SCHEMA_A, "broken_inline", (() => 42) as unknown as RichTextInlineNodeRenderer);

    const thrown = renderRichTextHtml(
      paragraphWith(mathNode(), { type: "broken_inline" }),
      { schema: SCHEMA_A }
    );

    expect(thrown).toContain('data-nightfire-inline-node="math_inline"');
    expect(thrown).toContain('data-nightfire-inline-fallback="failed"');
    expect(thrown).toContain('data-nightfire-inline-node="broken_inline"');
    expect(thrown.match(/data-nightfire-inline-fallback="failed"/g)).toHaveLength(2);
    expect(thrown).toContain(">math_inline<");
    expect(thrown).toContain(">broken_inline<");
  });

  it("refuses to override an admitted built-in node", () => {
    for (const type of ["paragraph", "heading", "text", "image", "table"]) {
      expect(() => registerRichTextInlineNodeRenderer(SCHEMA_A, type, latexRenderer()))
        .toThrow(/built in/);
    }
  });

  it("refuses a registration with no usable scope", () => {
    expect(() => registerRichTextInlineNodeRenderer("", "math_inline", latexRenderer()))
      .toThrow(TypeError);
    expect(() => registerRichTextInlineNodeRenderer("   ", "math_inline", latexRenderer()))
      .toThrow(TypeError);
    expect(() => registerRichTextInlineNodeRenderer(SCHEMA_A, "", latexRenderer()))
      .toThrow(TypeError);
    expect(() =>
      registerRichTextInlineNodeRenderer(
        SCHEMA_A,
        "math_inline",
        "not a function" as unknown as RichTextInlineNodeRenderer
      )
    ).toThrow(TypeError);
  });

  it("lets the last registration win and unregisters back to the fallback", () => {
    register(SCHEMA_A, "math_inline", () => "<span>first</span>");
    register(SCHEMA_A, "math_inline", () => "<span>second</span>");

    const document = paragraphWith(mathNode());
    expect(renderRichTextHtml(document, { schema: SCHEMA_A })).toContain("second");
    expect(renderRichTextHtml(document, { schema: SCHEMA_A })).not.toContain("first");

    expect(unregisterRichTextInlineNodeRenderer(SCHEMA_A, "math_inline")).toBe(true);
    expect(unregisterRichTextInlineNodeRenderer(SCHEMA_A, "math_inline")).toBe(false);

    const rendered = renderRichTextHtml(document, { schema: SCHEMA_A });
    expect(rendered).toContain('data-nightfire-inline-fallback="unregistered"');
    expect(rendered).not.toContain("second");
  });

  it("sanitizes hostile registered output, attributes and URLs", () => {
    register(SCHEMA_A, "math_inline", ({ escapeText }) => {
      return (
        `<span class="math-inline" onclick="alert(1)">${escapeText("<script>evil()</script>")}</span>` +
        '<script>alert(2)</script>' +
        '<a href="javascript:alert(3)">bad link</a>' +
        '<img src="x" onerror="alert(4)">'
      );
    });

    const html = renderRichTextHtml(paragraphWith(mathNode()), { schema: SCHEMA_A });

    expect(html).toContain("&lt;script&gt;evil()&lt;/script&gt;");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });

  it("keeps representative consumer maths markup useful after sanitization", () => {
    register(SCHEMA_A, "math_inline", ({ node, escapeText, escapeAttribute }) => {
      const latex = String(node.attrs.latex ?? "");
      return (
        `<span class="math-inline" data-latex="${escapeAttribute(latex)}">` +
        `<span class="math-base">${escapeText(latex.split("^")[0] ?? "")}</span>` +
        `<sup class="math-exponent">${escapeText(latex.split("^")[1] ?? "")}</sup>` +
        "</span>"
      );
    });

    const html = renderRichTextHtml(
      paragraphWith(
        { type: "text", text: "So " },
        mathNode({ latex: "x^2" }),
        { type: "text", text: " stays small." }
      ),
      { schema: SCHEMA_A }
    );

    expect(html).toBe(
      '<p>So <span class="math-inline" data-latex="x^2">' +
        '<span class="math-base">x</span><sup class="math-exponent">2</sup>' +
        "</span> stays small.</p>"
    );
  });

  it("still refuses a non-document on the public path", () => {
    expect(renderRichTextHtml(null, { schema: SCHEMA_A })).toBe("");
    expect(renderRichTextHtml({ type: "paragraph" }, { schema: SCHEMA_A })).toBe("");
    expect(renderRichTextHtml("doc", { schema: SCHEMA_A })).toBe("");
  });
});
