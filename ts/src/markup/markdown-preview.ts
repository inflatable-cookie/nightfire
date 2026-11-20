import { renderSafeMarkdownHtml } from "./safe-markdown";

/**
 * Render markdown to sanitized preview HTML.
 *
 * The Poodle `MarkdownEditor` preview renders via `{@html}`; every Nightfire
 * wrapper must route preview HTML through this helper so raw markup like
 * `<img onerror>` cannot execute at authoring time.
 */
export function renderSafeMarkdownPreview(markdown: string): string {
  return renderSafeMarkdownHtml(markdown);
}
