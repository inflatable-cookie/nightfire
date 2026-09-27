// ProseMirror JSON → semantic HTML for the stored rich-text vocabulary.
//
// The admitted node and mark set is Poodle's closed feature vocabulary
// (docs/knowledge/domain/vocabulary.md). This module serializes that stored
// JSON without TipTap, ProseMirror, or Poodle. Unknown nodes and marks are
// skipped rather than thrown: a learner-facing renderer must not crash on a
// hostile document, and the sanitizer is the second gate.

const ADMITTED_HEADING_LEVELS = new Set([1, 2, 3, 4, 5, 6]);
const ADMITTED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

type MarkJSON = {
  type?: unknown;
  attrs?: Record<string, unknown>;
};

type NodeJSON = {
  type?: unknown;
  attrs?: Record<string, unknown>;
  content?: unknown[];
  marks?: MarkJSON[];
  text?: unknown;
};

function urlProtocolOf(value: string): string {
  try {
    return new URL(value, "https://nightfire.invalid").protocol;
  } catch {
    return "";
  }
}

function isAdmittedLinkHref(href: string): boolean {
  if (href.startsWith("#")) return true;
  return ADMITTED_URL_PROTOCOLS.has(urlProtocolOf(href));
}

function isAdmittedImageUrl(src: string): boolean {
  const protocol = urlProtocolOf(src);
  if (protocol === "data:") {
    return /^data:image\//i.test(src) && !/[\r\n]/.test(src);
  }
  return ADMITTED_URL_PROTOCOLS.has(protocol);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function attr(name: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return ` ${name}="${escapeAttr(value)}"`;
}

function attrsOf(node: NodeJSON): Record<string, unknown> {
  return node.attrs && typeof node.attrs === "object" && !Array.isArray(node.attrs)
    ? node.attrs
    : {};
}

function childrenOf(node: NodeJSON): string {
  if (!Array.isArray(node.content)) return "";
  return node.content.map(renderNode).join("");
}

function wrapMark(mark: MarkJSON, inner: string): string {
  if (!mark || typeof mark.type !== "string") return inner;
  const attrs = mark.attrs && typeof mark.attrs === "object" && !Array.isArray(mark.attrs)
    ? mark.attrs
    : {};
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
      if (!href || !isAdmittedLinkHref(href)) return inner;
      const title = attr("title", attrs.title);
      const target = attr("target", attrs.target);
      const rel = attr("rel", attrs.rel);
      return `<a href="${escapeAttr(href)}"${title}${target}${rel}>${inner}</a>`;
    }
    default:
      return inner;
  }
}

function renderText(node: NodeJSON): string {
  if (typeof node.text !== "string") return "";
  let html = escapeHtml(node.text);
  if (!Array.isArray(node.marks)) return html;
  for (const mark of node.marks) html = wrapMark(mark, html);
  return html;
}

function headingTag(level: unknown): string | null {
  if (typeof level !== "number" || !ADMITTED_HEADING_LEVELS.has(level)) return null;
  return `h${level}`;
}

function renderTable(node: NodeJSON): string {
  return `<table><tbody>${childrenOf(node)}</tbody></table>`;
}

function cellTag(kind: "th" | "td", node: NodeJSON): string {
  const attrs = attrsOf(node);
  const parts: string[] = [];
  if (typeof attrs.colspan === "number" && attrs.colspan > 1) {
    parts.push(` colspan="${attrs.colspan}"`);
  }
  if (typeof attrs.rowspan === "number" && attrs.rowspan > 1) {
    parts.push(` rowspan="${attrs.rowspan}"`);
  }
  if (typeof attrs.align === "string" && attrs.align.length > 0) {
    parts.push(attr("align", attrs.align));
  }
  return `<${kind}${parts.join("")}>${childrenOf(node)}</${kind}>`;
}

function renderNode(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const node = value as NodeJSON;
  if (typeof node.type !== "string") return "";

  switch (node.type) {
    case "doc":
      return childrenOf(node);
    case "text":
      return renderText(node);
    case "paragraph":
      return `<p>${childrenOf(node)}</p>`;
    case "heading": {
      const tag = headingTag(attrsOf(node).level);
      return tag ? `<${tag}>${childrenOf(node)}</${tag}>` : childrenOf(node);
    }
    case "bulletList":
      return `<ul>${childrenOf(node)}</ul>`;
    case "orderedList": {
      const attrs = attrsOf(node);
      const start =
        typeof attrs.start === "number" && attrs.start !== 1
          ? ` start="${attrs.start}"`
          : "";
      const type = attr("type", attrs.type);
      return `<ol${start}${type}>${childrenOf(node)}</ol>`;
    }
    case "listItem":
      return `<li>${childrenOf(node)}</li>`;
    case "blockquote":
      return `<blockquote>${childrenOf(node)}</blockquote>`;
    case "codeBlock": {
      const language = attrsOf(node).language;
      const cls =
        typeof language === "string" && language.length > 0
          ? ` class="language-${escapeAttr(language)}"`
          : "";
      return `<pre><code${cls}>${childrenOf(node)}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "image": {
      const attrs = attrsOf(node);
      const src = typeof attrs.src === "string" ? attrs.src : "";
      if (!src || !isAdmittedImageUrl(src)) return "";
      const alt = typeof attrs.alt === "string" ? attrs.alt : "";
      const title = attr("title", attrs.title);
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${title}>`;
    }
    case "table":
      return renderTable(node);
    case "tableRow":
      return `<tr>${childrenOf(node)}</tr>`;
    case "tableHeader":
      return cellTag("th", node);
    case "tableCell":
      return cellTag("td", node);
    default:
      return childrenOf(node);
  }
}

/**
 * Serialize a stored ProseMirror document JSON to semantic HTML. Anything that
 * is not a `doc` yields an empty string.
 */
export function renderRichTextDocumentHtml(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  if ((value as NodeJSON).type !== "doc") return "";
  return renderNode(value);
}
