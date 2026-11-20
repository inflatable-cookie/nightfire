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

const NON_TEXT_CONTENT_NODES = new Set(["image", "horizontalRule"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasContent(node: unknown): boolean {
  if (!isRecord(node)) {
    return false;
  }

  if (node.type === "text") {
    return typeof node.text === "string" && node.text.trim().length > 0;
  }
  if (node.type === "hardBreak") {
    return false;
  }
  if (typeof node.type === "string" && NON_TEXT_CONTENT_NODES.has(node.type)) {
    return true;
  }
  return Array.isArray(node.content) && node.content.some(hasContent);
}

/**
 * Whether a stored `data.document` is empty: absent, not an object, or a
 * document with no text and no non-text content node.
 */
export function isRichTextDocumentEmpty(value: unknown): boolean {
  return !hasContent(value);
}
