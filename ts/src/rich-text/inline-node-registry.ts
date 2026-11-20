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

import { ADMITTED_BUILTIN_NODE_TYPES } from "./builtin-node-types";

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

// Two levels, schema then type, so lookup never builds a composite string key
// that a schema or type containing the separator could collide with.
const renderers = new Map<string, Map<string, RichTextInlineNodeRenderer>>();

function requireName(label: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`rich-text inline node renderer needs a non-empty ${label}`);
  }
  return value.trim();
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
 * throws, because those registrations have no defined scope. Schema and type
 * names are stored trimmed.
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
  let byType = renderers.get(scope);
  if (!byType) {
    byType = new Map();
    renderers.set(scope, byType);
  }
  byType.set(nodeType, renderer);
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
  const scope = schema.trim();
  const byType = renderers.get(scope);
  if (!byType) return false;
  const removed = byType.delete(type.trim());
  if (byType.size === 0) renderers.delete(scope);
  return removed;
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
  return renderers.get(schema.trim())?.get(type.trim()) ?? null;
}
