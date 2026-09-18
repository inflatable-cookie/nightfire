// @vitest-environment jsdom
import { describe, expect, it, vi } from "../vitest";
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

import "../../src/render-registrations";
import "../../src/editor-registrations";
import { getBlockRenderer } from "../../src/render-registry";
import { getBlockEditor } from "../../src/editor-registry";

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

  it("renders structured content through the registered renderer", async () => {
    const view = render(RendererComponent as any, {
      block: { type: "rich_text", version: "initial", data: { document: structuredDocument } }
    });

    await waitFor(() => expect(view.container.querySelector("h2")).toBeTruthy());

    const root = view.container.querySelector('[data-nightfire-block="rich_text"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("class")).toBeNull();
    expect(view.container.querySelector("h2")!.textContent).toBe("Title");
    expect(view.container.querySelector("ul li p")!.textContent).toBe("One");
    const anchor = view.container.querySelector("a") as HTMLAnchorElement;
    expect(anchor.getAttribute("href")).toBe("https://example.com");
    expect(anchor.textContent).toBe("link");
  });

  it("renders nothing without a document", () => {
    const view = render(RendererComponent as any, {
      block: { type: "rich_text", version: "initial", data: {} }
    });
    expect(view.container.querySelector('[data-nightfire-block="rich_text"]')).toBeNull();
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
