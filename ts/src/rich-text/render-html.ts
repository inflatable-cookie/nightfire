import { sanitizeHtml } from "../html";
import { renderRichTextDocumentHtml } from "./render-document";

export interface RenderRichTextHtmlOptions {
  /**
   * The consumer schema whose inline-node registrations apply. Without a
   * schema no consumer registration is consulted and a custom leaf renders
   * Nightfire's visible fallback.
   */
  schema?: string | null;
}

/**
 * Render a stored ProseMirror document to HTML that is sanitized and ready for
 * Svelte `{@html}`. This is the public rich-text rendering entry point: the raw
 * serializer is not exported, so no unsanitized path is presented as safe.
 *
 * Anything that is not a `doc` node yields an empty string.
 */
export function renderRichTextHtml(
  value: unknown,
  options: RenderRichTextHtmlOptions = {}
): string {
  const schema =
    typeof options.schema === "string" && options.schema.length > 0
      ? options.schema
      : null;
  const html = renderRichTextDocumentHtml(value, { schema });
  return html ? sanitizeHtml(html) : "";
}
