import { describe, expect, it } from "../vitest";
import { isRichTextDocumentEmpty } from "../../src/rich-text/empty";
import { isBlockContentEmpty } from "../../src/editor-registry";

import "../../src/editor-registrations";

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }]
});

describe("nightfire/rich-text emptiness", () => {
  it("treats absent and malformed documents as empty", () => {
    for (const value of [undefined, null, "", 0, [], {}, { type: "doc" }, "not a document"]) {
      expect(isRichTextDocumentEmpty(value), String(value)).toBe(true);
    }
  });

  it("treats a document with no text and no non-text node as empty", () => {
    expect(
      isRichTextDocumentEmpty({ type: "doc", content: [{ type: "paragraph" }] })
    ).toBe(true);
    expect(
      isRichTextDocumentEmpty({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 } },
          { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] }
        ]
      })
    ).toBe(true);
  });

  it("treats whitespace-only text as empty", () => {
    expect(isRichTextDocumentEmpty(paragraph("   \n  "))).toBe(true);
    expect(
      isRichTextDocumentEmpty({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "hardBreak" }] }]
      })
    ).toBe(true);
  });

  it("treats text as content", () => {
    expect(isRichTextDocumentEmpty(paragraph("hello"))).toBe(false);
    expect(
      isRichTextDocumentEmpty({
        type: "doc",
        content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] }]
      })
    ).toBe(false);
  });

  it("treats a non-text content node as content", () => {
    for (const type of ["image", "horizontalRule"]) {
      expect(
        isRichTextDocumentEmpty({ type: "doc", content: [{ type, attrs: {} }] }),
        type
      ).toBe(false);
    }
  });

  it("answers through the registered rich_text checker", () => {
    expect(isBlockContentEmpty({ type: "rich_text", data: {} })).toBe(true);
    expect(
      isBlockContentEmpty({ type: "rich_text", data: { document: paragraph("hi") } })
    ).toBe(false);
  });
});
