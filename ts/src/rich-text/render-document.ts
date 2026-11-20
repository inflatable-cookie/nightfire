// ProseMirror JSON → semantic HTML for the stored rich-text vocabulary.
//
// The admitted node and mark set is Poodle's closed feature vocabulary
// (docs/knowledge/domain/vocabulary.md). This module serializes that stored
// JSON without TipTap, ProseMirror, or Poodle. Unknown marks are skipped and
// unknown containers keep their children rather than thrown: a learner-facing
// renderer must not crash on a hostile document, and the sanitizer is the
// second gate.
//
// A consumer may register a renderer for one of its own inline node types,
// scoped to one schema (see `inline-node-registry.ts`). Registered output is
// composed here and sanitized with the whole document by the public
// `renderRichTextHtml`; it never reaches `{@html}` from this module.

import {
  getRichTextInlineNodeRenderer,
  isAdmittedBuiltinRichTextNodeType
} from "./inline-node-registry";
import type { RichTextInlineNode } from "./inline-node-registry";

const ADMITTED_HEADING_LEVELS = new Set([1, 2, 3, 4, 5, 6]);
const ADMITTED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
// Raster types only. `image/svg+xml` can carry script, so it is never admitted
// as a data URL, whatever the sanitizer later strips.
const ADMITTED_DATA_IMAGE_URL = /^data:image\/(?:png|jpeg|gif|webp|avif)[;,]/i;
// HTML's own limits: colspan is clamped to 1000 and rowspan to 65534 by the
// specification, so a larger stored value cannot mean anything.
const MAX_COLSPAN = 1000;
const MAX_ROWSPAN = 65_534;
const REL_FOR_NEW_CONTEXT = ["noopener", "noreferrer"];

type MarkJSON = {
  type?: unknown;
  attrs?: Record<string, unknown>;
};

type NodeJSON = {
  type?: unknown;
  attrs?: Record<string, unknown>;
  content?: Array<unknown>;
  marks?: Array<MarkJSON>;
  text?: unknown;
};

export interface RenderRichTextDocumentOptions {
  /** Consumer schema whose inline-node registrations apply. */
  schema?: string | null;
}

type RenderContext = {
  schema: string | null;
};

function urlProtocolOf(value: string): string {
  try {
    return new URL(value, "https://nightfire.invalid").protocol;
  } catch {
    return "";
  }
}

function isAdmittedLinkHref(href: string): boolean {
  if (href.startsWith("#")) {
    return true;
  }
  return ADMITTED_URL_PROTOCOLS.has(urlProtocolOf(href));
}

function isAdmittedImageUrl(src: string): boolean {
  const protocol = urlProtocolOf(src);
  if (protocol === "data:") {
    return ADMITTED_DATA_IMAGE_URL.test(src) && !/[\r\n]/.test(src);
  }
  return ADMITTED_URL_PROTOCOLS.has(protocol);
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function attr(name: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }
  return ` ${name}="${escapeAttr(value)}"`;
}

function attrsOf(node: NodeJSON): Record<string, unknown> {
  return node.attrs && typeof node.attrs === "object" && !Array.isArray(node.attrs)
    ? node.attrs
    : {};
}

function childrenOf(node: NodeJSON, context: RenderContext): string {
  if (!Array.isArray(node.content)) {
    return "";
  }
  return node.content.map((child) => renderNode(child, context)).join("");
}

function applyMarks(marks: unknown, html: string): string {
  if (html === "" || !Array.isArray(marks)) {
    return html;
  }
  let wrapped = html;
  for (const mark of marks) {
    wrapped = wrapMark(mark as MarkJSON, wrapped);
  }
  return wrapped;
}

// A custom leaf that cannot be rendered must still say something: an empty
// string makes a formula silently disappear from a sentence. The fallback is
// the escaped node type inside a stable hook, with the cause recorded, so a
// consumer can read it and their stylesheet can target it.
function inlineLeafFallback(node: NodeJSON, reason: "unregistered" | "failed"): string {
  const type = typeof node.type === "string" ? node.type : "";
  return (
    `<span data-nightfire-inline-node="${escapeAttr(type)}"` +
    ` data-nightfire-inline-fallback="${reason}">${escapeHtml(type)}</span>`
  );
}

function renderUnadmittedNode(node: NodeJSON, context: RenderContext): string {
  const type = typeof node.type === "string" ? node.type : "";
  const children = childrenOf(node, context);
  const renderer = getRichTextInlineNodeRenderer(context.schema, type);

  // An unknown container is not an inline leaf: keep its children, even an empty
  // list, rather than replacing it with a fallback label. Only a node with no
  // content array is a leaf.
  if (!renderer) {
    if (Array.isArray(node.content)) {
      return children;
    }
    return applyMarks(node.marks, inlineLeafFallback(node, "unregistered"));
  }

  const inlineNode: RichTextInlineNode = {
    type,
    attrs: attrsOf(node),
    content: Array.isArray(node.content) ? node.content : []
  };

  let html: string;
  try {
    const output = renderer({
      schema: context.schema as string,
      node: inlineNode,
      childrenHtml: children,
      escapeText: escapeHtml,
      escapeAttribute: escapeAttr
    });
    if (typeof output !== "string") {
      return applyMarks(node.marks, inlineLeafFallback(node, "failed"));
    }
    html = output;
  } catch {
    return applyMarks(node.marks, inlineLeafFallback(node, "failed"));
  }
  return applyMarks(node.marks, html);
}

function wrapMark(mark: MarkJSON, inner: string): string {
  if (!mark || typeof mark.type !== "string") {
    return inner;
  }
  const attrs =
    mark.attrs && typeof mark.attrs === "object" && !Array.isArray(mark.attrs) ? mark.attrs : {};
  switch (mark.type) {
    case "bold":
      return `<strong>${inner}</strong>`;
    case "italic":
      return `<em>${inner}</em>`;
    case "strike":
      return `<s>${inner}</s>`;
    case "code":
      return `<code>${inner}</code>`;
    case "link": {
      const href = typeof attrs.href === "string" ? attrs.href : "";
      if (!href || !isAdmittedLinkHref(href)) {
        return inner;
      }
      const title = attr("title", attrs.title);
      const target = attr("target", attrs.target);
      const rel = linkRel(attrs.target, attrs.rel);
      return `<a href="${escapeAttr(href)}"${title}${target}${rel}>${inner}</a>`;
    }
    default:
      return inner;
  }
}

// A link that opens a new browsing context must not hand the new page a
// reference to this one. Stored tokens are kept and the two required ones added.
function linkRel(target: unknown, rel: unknown): string {
  const tokens = typeof rel === "string" ? rel.split(/\s+/).filter(Boolean) : [];
  if (target === "_blank") {
    for (const token of REL_FOR_NEW_CONTEXT) {
      if (!tokens.includes(token)) {
        tokens.push(token);
      }
    }
  }
  return tokens.length > 0 ? attr("rel", tokens.join(" ")) : "";
}

// A span is an integer within the HTML limit. Anything else (NaN, Infinity,
// fractions, 0, 1 or negatives) means the default of one, so no unparseable
// value reaches an attribute.
function boundedSpan(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 1 && value <= max
    ? value
    : null;
}

function renderText(node: NodeJSON): string {
  if (typeof node.text !== "string") {
    return "";
  }
  return applyMarks(node.marks, escapeHtml(node.text));
}

function headingTag(level: unknown): string | null {
  if (typeof level !== "number" || !ADMITTED_HEADING_LEVELS.has(level)) {
    return null;
  }
  return `h${level}`;
}

function renderTable(node: NodeJSON, context: RenderContext): string {
  return `<table><tbody>${childrenOf(node, context)}</tbody></table>`;
}

function cellTag(kind: "th" | "td", node: NodeJSON, context: RenderContext): string {
  const attrs = attrsOf(node);
  const parts: Array<string> = [];
  const colspan = boundedSpan(attrs.colspan, MAX_COLSPAN);
  if (colspan !== null) {
    parts.push(` colspan="${colspan}"`);
  }
  const rowspan = boundedSpan(attrs.rowspan, MAX_ROWSPAN);
  if (rowspan !== null) {
    parts.push(` rowspan="${rowspan}"`);
  }
  if (typeof attrs.align === "string" && attrs.align.length > 0) {
    parts.push(attr("align", attrs.align));
  }
  return `<${kind}${parts.join("")}>${childrenOf(node, context)}</${kind}>`;
}

function renderNode(value: unknown, context: RenderContext): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  const node = value as NodeJSON;
  if (typeof node.type !== "string" || node.type.length === 0) {
    return "";
  }
  if (!isAdmittedBuiltinRichTextNodeType(node.type)) {
    return renderUnadmittedNode(node, context);
  }

  switch (node.type) {
    case "doc":
      return childrenOf(node, context);
    case "text":
      return renderText(node);
    case "paragraph":
      return `<p>${childrenOf(node, context)}</p>`;
    case "heading": {
      const tag = headingTag(attrsOf(node).level);
      return tag ? `<${tag}>${childrenOf(node, context)}</${tag}>` : childrenOf(node, context);
    }
    case "bulletList":
      return `<ul>${childrenOf(node, context)}</ul>`;
    case "orderedList": {
      const attrs = attrsOf(node);
      // Only positive safe integers above the default of 1 serialize; zero,
      // negatives, and non-integers (NaN, Infinity, fractions) are dropped.
      const start =
        typeof attrs.start === "number" && Number.isSafeInteger(attrs.start) && attrs.start > 1
          ? ` start="${attrs.start}"`
          : "";
      const type = attr("type", attrs.type);
      return `<ol${start}${type}>${childrenOf(node, context)}</ol>`;
    }
    case "listItem":
      return `<li>${childrenOf(node, context)}</li>`;
    case "blockquote":
      return `<blockquote>${childrenOf(node, context)}</blockquote>`;
    case "codeBlock": {
      const language = attrsOf(node).language;
      const cls =
        typeof language === "string" && language.length > 0
          ? ` class="language-${escapeAttr(language)}"`
          : "";
      return `<pre><code${cls}>${childrenOf(node, context)}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "image": {
      const attrs = attrsOf(node);
      const src = typeof attrs.src === "string" ? attrs.src : "";
      if (!src || !isAdmittedImageUrl(src)) {
        return "";
      }
      const alt = typeof attrs.alt === "string" ? attrs.alt : "";
      const title = attr("title", attrs.title);
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${title}>`;
    }
    case "table":
      return renderTable(node, context);
    case "tableRow":
      return `<tr>${childrenOf(node, context)}</tr>`;
    case "tableHeader":
      return cellTag("th", node, context);
    case "tableCell":
      return cellTag("td", node, context);
    default:
      // Unreachable: the admitted-type check above routes every other type to
      // renderUnadmittedNode, and this switch covers the admitted set.
      return "";
  }
}

/**
 * Serialize a stored ProseMirror document JSON to semantic HTML, composing any
 * consumer inline-node renderer registered for `options.schema`.
 *
 * The result is NOT sanitized. It is internal to the package: use
 * `renderRichTextHtml` (`./render-html`) for HTML that may reach `{@html}`.
 * Anything that is not a `doc` yields an empty string.
 */
export function renderRichTextDocumentHtml(
  value: unknown,
  options: RenderRichTextDocumentOptions = {}
): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  if ((value as NodeJSON).type !== "doc") {
    return "";
  }
  const schema =
    typeof options.schema === "string" && options.schema.length > 0 ? options.schema : null;
  return renderNode(value, { schema });
}
