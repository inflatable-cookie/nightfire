// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "../vitest";
import { readFileSync } from "node:fs";
import { fireEvent, render, waitFor } from "../render";

// ProseMirror reads geometry when it scrolls the selection into view. jsdom has
// no layout, so the Range and Node geometry calls it makes are stubbed.
const emptyRect = {
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON() {}
};
for (const proto of [Node.prototype, (globalThis as any).Range?.prototype].filter(Boolean)) {
  if (typeof (proto as any).getClientRects !== "function") (proto as any).getClientRects = () => [];
  if (typeof (proto as any).getBoundingClientRect !== "function") {
    (proto as any).getBoundingClientRect = () => emptyRect;
  }
}

import NightfireRenderer from "../../src/NightfireRenderer.svelte";
import "../../src/render-registrations";
import "../../src/editor-registrations";
import { getBlockRenderer } from "../../src/render-registry";
import { getBlockEditor } from "../../src/editor-registry";
import {
  registerRichTextInlineNodeRenderer,
  unregisterRichTextInlineNodeRenderer
} from "../../src/rich-text";

const structuredDocument = {
  type: "doc" as const,
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "See " },
        {
          type: "text",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          text: "link"
        }
      ]
    }
  ]
};

const RendererComponent = getBlockRenderer(undefined, "rich_text");
const EditorComponent = getBlockEditor(undefined, "rich_text");

describe("nightfire/rich-text block", () => {
  it("registers both parts", () => {
    expect(RendererComponent).toBeTruthy();
    expect(EditorComponent).toBeTruthy();
  });

  it("renders structured content through the registered renderer", () => {
    const view = render(RendererComponent as any, {
      block: { type: "rich_text", version: "initial", data: { document: structuredDocument } }
    });

    const root = view.container.querySelector('[data-nightfire-block="rich_text"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("class")).toBeNull();
    expect(view.container.querySelector("h2")!.textContent).toBe("Title");
    expect(view.container.querySelector("ul li p")!.textContent).toBe("One");
    const anchor = view.container.querySelector("a") as HTMLAnchorElement;
    expect(anchor.getAttribute("href")).toBe("https://example.com");
    expect(anchor.textContent).toBe("link");
  });

  it("matches the committed rich-text fixture HTML", () => {
    const fixture = JSON.parse(
      readFileSync("fixtures/wire/v1/nightfire-values.json", "utf8")
    );
    const block = fixture.values
      .find((entry: { name: string }) => entry.name === "core-payloads")
      .value.blocks.find((entry: { type: string }) => entry.type === "rich_text");
    const view = render(RendererComponent as any, { block });
    const root = view.container.querySelector('[data-nightfire-block="rich_text"]');
    expect(root).toBeTruthy();
    expect(root!.innerHTML.replaceAll("<!---->", "")).toBe(
      "<h2>Title</h2><p><strong>Hello</strong></p>"
    );
  });

  it("renders nothing without a document", () => {
    const view = render(RendererComponent as any, {
      block: { type: "rich_text", version: "initial", data: {} }
    });
    expect(view.container.querySelector('[data-nightfire-block="rich_text"]')).toBeNull();
  });

  it("sanitizes hostile text and URLs before HTML insertion", () => {
    const view = render(RendererComponent as any, {
      block: {
        type: "rich_text",
        version: "initial",
        data: {
          document: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "<script>evil()</script>" },
                  {
                    type: "text",
                    text: "click",
                    marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }]
                  }
                ]
              }
            ]
          }
        }
      }
    });
    expect(view.container.querySelector("script")).toBeNull();
    expect(view.container.innerHTML.toLowerCase()).not.toContain("javascript:");
    expect(view.container.innerHTML).toContain("click");
    expect(view.container.textContent).toContain("<script>evil()</script>");
  });

  it("round-trips an edit as ProseMirror document JSON", async () => {
    const onChange = vi.fn();
    const view = render(EditorComponent as any, {
      block: {
        type: "rich_text",
        version: "initial",
        data: {
          document: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Start" }] }]
          }
        }
      },
      onChange
    });

    await waitFor(() =>
      expect(view.container.querySelector('[contenteditable="true"]')).toBeTruthy()
    );
    const editable = view.container.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editable.textContent).toContain("Start");

    editable.focus();
    editable.textContent = "Start edited";
    await fireEvent.input(editable, { inputType: "insertText", data: "x" });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const next = onChange.mock.calls.at(-1)![0];
    expect(next.type).toBe("rich_text");
    expect(next.version).toBe("initial");
    expect(typeof next.data.document).toBe("object");
    expect(next.data.document.type).toBe("doc");
    expect(JSON.stringify(next.data.document)).toContain("Start edited");
  });
});

const INLINE_SCHEMA = "test.math-schema";

function registerMathInline(): void {
  registerRichTextInlineNodeRenderer(
    INLINE_SCHEMA,
    "math_inline",
    ({ node, escapeText, escapeAttribute }) => {
      const latex = String((node.attrs as { latex?: unknown }).latex ?? "");
      return (
        `<span class="math-inline" data-latex="${escapeAttribute(latex)}">` +
        `${escapeText(latex)}</span>`
      );
    }
  );
}

afterEach(() => {
  unregisterRichTextInlineNodeRenderer(INLINE_SCHEMA, "math_inline");
});

const sentenceDocument = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "The value " },
        { type: "math_inline", attrs: { latex: "x^2" } },
        { type: "text", text: " is small." }
      ]
    }
  ]
};

describe("nightfire/rich-text with schema-scoped inline nodes", () => {
  it("renders a registered consumer node inside the sentence", () => {
    registerMathInline();
    const view = render(RendererComponent as any, {
      block: { type: "rich_text", version: "initial", data: { document: sentenceDocument } },
      schema: INLINE_SCHEMA
    });

    const formula = view.container.querySelector(".math-inline");
    expect(formula).toBeTruthy();
    expect(formula!.getAttribute("data-latex")).toBe("x^2");
    expect(view.container.textContent).toBe("The value x^2 is small.");
  });

  it("does not apply one schema's registration to another schema", () => {
    registerMathInline();
    const view = render(RendererComponent as any, {
      block: { type: "rich_text", version: "initial", data: { document: sentenceDocument } },
      schema: "test.other-schema"
    });

    expect(view.container.querySelector(".math-inline")).toBeNull();
    expect(
      view.container.querySelector('[data-nightfire-inline-node="math_inline"]')
    ).toBeTruthy();
    expect(view.container.textContent).toContain("The value math_inline is small.");
  });

  it("keeps the schema when rich text is nested in an item_list", () => {
    registerMathInline();
    const view = render(NightfireRenderer as any, {
      value: {
        schema: INLINE_SCHEMA,
        blocks: [
          {
            type: "item_list",
            version: "initial",
            data: {
              items: [
                {
                  title: "Step",
                  body: [
                    {
                      type: "rich_text",
                      version: "initial",
                      data: { document: sentenceDocument }
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    });

    const root = view.container.querySelector('[data-nightfire-block="rich_text"]');
    expect(root).toBeTruthy();
    expect(root!.querySelector(".math-inline")).toBeTruthy();
    expect(view.container.textContent).toContain("Step");
    expect(view.container.textContent).toContain("is small.");
  });
});
