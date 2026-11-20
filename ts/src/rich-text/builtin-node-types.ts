// Every node type the built-in rich-text serializer handles. One list, read by
// both the serializer (which renders these) and the inline-node registry (which
// refuses to let a consumer replace them).
//
// Registering one of these is refused rather than silently ignored, so a
// consumer cannot change the rendering of a committed fixture by accident.

export const ADMITTED_BUILTIN_NODE_TYPES: ReadonlySet<string> = new Set([
  "doc",
  "text",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "image",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell"
]);
