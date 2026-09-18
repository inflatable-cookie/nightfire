// Emptiness for the `rich_text` block.
//
// The content is a ProseMirror document, so "empty" is structural rather than a
// string test: a document holds something when it carries text or a non-text
// content node. Container nodes (the document, paragraphs, headings, lists,
// blockquotes, code blocks, tables) contribute only their children; a hard break
// is whitespace and does not make a document non-empty.
//
// This is an emptiness predicate, not a schema: the admitted vocabulary stays
// Poodle's, and the only names here are the two non-text content nodes that set
// admits.

import type { ProseMirrorNodeJSON } from "@inflatable-cookie/poodle-svelte/rich-text";

const NON_TEXT_CONTENT_NODES = new Set(["image", "horizontalRule"]);

function hasContent(node: unknown): boolean {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;

  const typed = node as ProseMirrorNodeJSON;
  if (typed.type === "text") {
    return typeof typed.text === "string" && typed.text.trim().length > 0;
  }
  if (typed.type === "hardBreak") return false;
  if (typeof typed.type === "string" && NON_TEXT_CONTENT_NODES.has(typed.type)) {
    return true;
  }
  return Array.isArray(typed.content) && typed.content.some(hasContent);
}

/**
 * Whether a stored `data.document` is empty: absent, not an object, or a
 * document with no text and no non-text content node.
 */
export function isRichTextDocumentEmpty(value: unknown): boolean {
  return !hasContent(value);
}
