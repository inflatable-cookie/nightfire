import DOMPurify from "isomorphic-dompurify";

const SAFE_TEXT_FALLBACK = "";

const EMBED_ALLOWED_TAGS = ["iframe", "audio", "video", "source"];
const EMBED_ALLOWED_ATTR = [
  "src",
  "title",
  "width",
  "height",
  "allow",
  "allowfullscreen",
  "frameborder",
  "loading",
  "referrerpolicy",
  "playsinline",
  "controls",
  "autoplay",
  "muted",
  "loop",
  "preload",
  "poster",
  "type"
];

const SVG_ALLOWED_ATTR = [
  "xmlns",
  "viewBox",
  "width",
  "height",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "d",
  "x",
  "y",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x1",
  "x2",
  "y1",
  "y2",
  "points",
  "transform",
  "class",
  "id"
];

// SVG admits no `style` attribute and no `<style>` element. A `<style>` block is
// not scoped to the icon, so it would restyle the whole host page, and a style
// attribute can load remote resources through `url(...)`. Appearance belongs to
// the consumer's stylesheet (docs/knowledge/contracts/styling.md).
const SVG_FORBIDDEN_TAGS = ["script", "foreignObject", "style"];
const SVG_FORBIDDEN_ATTR = ["style"];

function toInput(value: string | null | undefined): string {
  return typeof value === "string" ? value : SAFE_TEXT_FALLBACK;
}

export function sanitizeHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(toInput(html), {
    USE_PROFILES: { html: true }
  });
}

export function sanitizeEmbedHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(toInput(html), {
    ALLOWED_TAGS: EMBED_ALLOWED_TAGS,
    ALLOWED_ATTR: EMBED_ALLOWED_ATTR,
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
}

export function sanitizeSvgHtml(svg: string | null | undefined): string {
  return DOMPurify.sanitize(toInput(svg), {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_ATTR: SVG_ALLOWED_ATTR,
    // The svg profile adds its own attributes to ALLOWED_ATTR, so `style` must be
    // forbidden explicitly rather than left out of the allow-list.
    FORBID_ATTR: SVG_FORBIDDEN_ATTR,
    FORBID_TAGS: SVG_FORBIDDEN_TAGS
  });
}
