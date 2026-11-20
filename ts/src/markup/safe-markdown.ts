import { marked } from "marked";

import { sanitizeHtml } from "../html.js";

/**
 * The one markdown-to-`{@html}` path. Every markdown surface (the markdown
 * block, table cells and the editor preview) renders through here, so the
 * parse-then-sanitize order cannot drift between call sites.
 *
 * Blank input yields an empty string. The result is sanitized and safe for
 * Svelte `{@html}`.
 */
export function renderSafeMarkdownHtml(markdown: string | null | undefined): string {
  const source = typeof markdown === "string" ? markdown : "";
  if (source.trim().length === 0) return "";
  return sanitizeHtml(marked.parse(source, { async: false }) as string);
}
