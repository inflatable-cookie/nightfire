// Consumer-owned inline rich-text nodes.
//
// The stored rich-text vocabulary is closed and belongs to Poodle's editor
// features (docs/knowledge/domain/vocabulary.md): Nightfire admits no node or
// mark of its own, and this registry is not an editor extension. It lets a
// consumer display a stored node that Poodle never authored, such as a maths
// leaf written by the consumer's own tooling, without adding a product schema,
// a maths dependency, or a wire change to Nightfire.
//
// Scope rules, fixed by docs/knowledge/domain/vocabulary.md:
//
// - A registration is scoped to one consumer schema and applies to documents
//   rendered with exactly that schema. There is no wildcard: an extension must
//   not leak into another schema's documents.
// - A registration may not replace an admitted built-in node. The built-in
//   vocabulary renders identically with or without this registry.
// - The last registration for a schema and type wins; unregistering restores
//   the built-in unknown-leaf fallback.

export type RichTextInlineNode = {
  type: string;
  attrs: Readonly<Record<string, unknown>>;
  content: readonly unknown[];
};

export interface RichTextInlineNodeContext {
  /** The consumer schema whose registration supplied this renderer. */
  schema: string;
  node: RichTextInlineNode;
  /**
   * The node's stored content rendered to HTML, empty for a leaf. It is
   * unsanitized composition at this point; the document is sanitized as a
   * whole before any `{@html}` insertion.
   */
  childrenHtml: string;
  /** Escape a value for HTML text content. */
  escapeText(value: string): string;
  /** Escape a value for a double-quoted HTML attribute. */
  escapeAttribute(value: string): string;
}

/** Return HTML for the node. The document sanitizer runs after composition. */
export type RichTextInlineNodeRenderer = (
  context: RichTextInlineNodeContext
) => string;

// Every node the built-in serializer handles. Registering one of these is
// refused rather than silently ignored, so a consumer cannot change the
// rendering of a committed fixture by accident.
const ADMITTED_BUILTIN_NODE_TYPES: ReadonlySet<string> = new Set([
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
  "tableCell",
]);

const SEPARATOR = "\u0000";

const renderers = new Map<string, RichTextInlineNodeRenderer>();

function makeKey(schema: string, type: string): string {
  return `${schema}${SEPARATOR}${type}`;
}

function requireName(label: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`rich-text inline node renderer needs a non-empty ${label}`);
  }
  return value;
}

/**
 * Whether the built-in serializer owns this node type. A consumer extension may
 * not replace it.
 */
export function isAdmittedBuiltinRichTextNodeType(type: string): boolean {
  return ADMITTED_BUILTIN_NODE_TYPES.has(type);
}

/**
 * Register a renderer for one consumer inline-node type within one schema.
 * Registering the same schema and type again replaces the earlier renderer.
 * Registering an admitted built-in node type, an empty schema or an empty type
 * throws, because those registrations have no defined scope.
 */
export function registerRichTextInlineNodeRenderer(
  schema: string,
  type: string,
  renderer: RichTextInlineNodeRenderer
): void {
  const scope = requireName("schema", schema);
  const nodeType = requireName("node type", type);
  if (typeof renderer !== "function") {
    throw new TypeError("rich-text inline node renderer must be a function");
  }
  if (isAdmittedBuiltinRichTextNodeType(nodeType)) {
    throw new TypeError(
      `rich-text node type ${nodeType} is built in and cannot be overridden`
    );
  }
  renderers.set(makeKey(scope, nodeType), renderer);
}

/**
 * Remove one schema-scoped registration. Returns false when none was
 * registered, so a caller can tell cleanup from a typo.
 */
export function unregisterRichTextInlineNodeRenderer(
  schema: string,
  type: string
): boolean {
  if (typeof schema !== "string" || typeof type !== "string") return false;
  return renderers.delete(makeKey(schema, type));
}

/**
 * Resolve the renderer for a schema and node type. Matching is exact: a
 * registration for one schema never answers for another.
 */
export function getRichTextInlineNodeRenderer(
  schema: string | null | undefined,
  type: string | undefined
): RichTextInlineNodeRenderer | null {
  if (!schema || !type) return null;
  return renderers.get(makeKey(schema, type)) ?? null;
}
