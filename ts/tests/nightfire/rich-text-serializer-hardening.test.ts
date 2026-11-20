import { afterEach, describe, expect, it } from "../vitest";
import { renderRichTextDocumentHtml } from "../../src/rich-text/render-document";
import {
  getRichTextInlineNodeRenderer,
  registerRichTextInlineNodeRenderer,
  unregisterRichTextInlineNodeRenderer,
} from "../../src/rich-text/inline-node-registry";
import { renderRichTextHtml } from "../../src/rich-text";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const paragraph = (...content: unknown[]) => ({ type: "paragraph", content });
const text = (value: string, marks?: unknown[]) =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };

function tableWithCell(attrs: Record<string, unknown>) {
  return doc({
    type: "table",
    content: [
      {
        type: "tableRow",
        content: [{ type: "tableCell", attrs, content: [paragraph(text("cell"))] }],
      },
    ],
  });
}

describe("rich-text serializer: numeric attributes", () => {
  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a fraction", 2.5],
    ["zero", 0],
    ["a negative", -3],
    ["above the HTML limit", 1001],
  ])("drops a %s colspan instead of writing it", (_label, value) => {
    const html = renderRichTextDocumentHtml(tableWithCell({ colspan: value }));
    expect(html).not.toContain("colspan");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });

  it("keeps a valid colspan and rowspan", () => {
    const html = renderRichTextDocumentHtml(tableWithCell({ colspan: 2, rowspan: 3 }));
    expect(html).toContain('<td colspan="2" rowspan="3">');
  });

  it("drops a non-finite rowspan", () => {
    const html = renderRichTextDocumentHtml(tableWithCell({ rowspan: Number.NaN }));
    expect(html).not.toContain("rowspan");
  });

  it("writes only a safe integer list start", () => {
    const list = (start: unknown) =>
      renderRichTextDocumentHtml(
        doc({ type: "orderedList", attrs: { start }, content: [] })
      );
    expect(list(Number.NaN)).toBe("<ol></ol>");
    expect(list(Number.POSITIVE_INFINITY)).toBe("<ol></ol>");
    expect(list(2.5)).toBe("<ol></ol>");
    expect(list(3)).toBe('<ol start="3"></ol>');
    expect(list(0)).toBe('<ol start="0"></ol>');
    expect(list(1)).toBe("<ol></ol>");
  });
});

describe("rich-text serializer: unknown and empty nodes", () => {
  it("keeps an empty content array on an unknown container instead of a fallback", () => {
    const html = renderRichTextDocumentHtml(
      doc(paragraph(text("before ")), { type: "unknown_wrapper", content: [] }, paragraph(text("after")))
    );
    expect(html).toBe("<p>before </p><p>after</p>");
    expect(html).not.toContain("data-nightfire-inline-node");
  });

  it("still shows the visible fallback for an unknown leaf with no content array", () => {
    const html = renderRichTextDocumentHtml(doc(paragraph({ type: "mystery_leaf" })));
    expect(html).toContain('data-nightfire-inline-fallback="unregistered"');
    expect(html).toContain("mystery_leaf</span>");
  });

  it("emits nothing for a node with an empty type", () => {
    const html = renderRichTextDocumentHtml(doc(paragraph({ type: "", attrs: {} }, text("kept"))));
    expect(html).toBe("<p>kept</p>");
    expect(html).not.toContain("data-nightfire-inline-node");
  });
});

describe("rich-text serializer: image URLs", () => {
  const image = (src: string) => renderRichTextDocumentHtml(doc({ type: "image", attrs: { src } }));

  it("admits safe raster data URLs", () => {
    for (const type of ["png", "jpeg", "gif", "webp", "avif"]) {
      expect(image(`data:image/${type};base64,AAAA`)).toContain("<img");
    }
  });

  it("refuses an SVG data URL, which can carry script", () => {
    expect(image("data:image/svg+xml;base64,PHN2Zz4=")).toBe("");
    expect(image("data:image/svg+xml,<svg onload=alert(1)>")).toBe("");
  });

  it("refuses a non-image data URL and one with a line break", () => {
    expect(image("data:text/html;base64,PGgxPg==")).toBe("");
    expect(image("data:image/png;base64,AA\nAA")).toBe("");
  });
});

describe("rich-text serializer: links", () => {
  const link = (attrs: Record<string, unknown>) =>
    renderRichTextDocumentHtml(
      doc(paragraph(text("open", [{ type: "link", attrs: { href: "https://example.com", ...attrs } }])))
    );

  it("adds noopener noreferrer to a new-context link", () => {
    expect(link({ target: "_blank" })).toBe(
      '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">open</a></p>'
    );
  });

  it("keeps a stored rel and adds the two required tokens once", () => {
    expect(link({ target: "_blank", rel: "nofollow noopener" })).toContain(
      'rel="nofollow noopener noreferrer"'
    );
  });

  it("leaves rel alone for a same-context link", () => {
    expect(link({ target: "_self" })).not.toContain("rel=");
    expect(link({ rel: "nofollow" })).toContain('rel="nofollow"');
  });
});

describe("rich-text inline-node registry keys", () => {
  const SCHEMA = "hardening.schema";
  afterEach(() => {
    unregisterRichTextInlineNodeRenderer(SCHEMA, "widget");
  });

  it("stores schema and type names trimmed", () => {
    const renderer = () => "<b>w</b>";
    registerRichTextInlineNodeRenderer(`  ${SCHEMA}  `, "  widget ", renderer);
    expect(getRichTextInlineNodeRenderer(SCHEMA, "widget")).toBe(renderer);
    expect(getRichTextInlineNodeRenderer(`${SCHEMA} `, "widget ")).toBe(renderer);
  });

  it("does not let a schema and type joined together collide with another pair", () => {
    registerRichTextInlineNodeRenderer("a", "b:c", () => "pair");
    expect(getRichTextInlineNodeRenderer("a:b", "c")).toBeNull();
    expect(getRichTextInlineNodeRenderer("a", "b:c")).not.toBeNull();
    unregisterRichTextInlineNodeRenderer("a", "b:c");
  });

  it("returns false when unregistering a name that was never registered", () => {
    expect(unregisterRichTextInlineNodeRenderer(SCHEMA, "widget")).toBe(false);
  });

  it("renders a registered widget through the public path", () => {
    registerRichTextInlineNodeRenderer(SCHEMA, "widget", ({ escapeText }) => `<i>${escapeText("ok")}</i>`);
    const html = renderRichTextHtml(
      doc(paragraph({ type: "widget", attrs: {} })),
      { schema: `${SCHEMA}` }
    );
    expect(html).toBe("<p><i>ok</i></p>");
  });
});
