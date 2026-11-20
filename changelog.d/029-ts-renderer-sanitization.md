### Fixed

- A `table` with several sections and no `section` on its rows no longer throws a duplicate-key error.
- A `table` alignment value outside `left | center | right | justify` or `top | middle | bottom | baseline` is dropped, not written into a style attribute.
- A `table` row without `cells` is skipped rather than crashing the renderer.
- A `video` embed id is percent-encoded, so a crafted id cannot break out of the `src`.
- A `video` block title containing `$&` is written literally, and a pasted frame's own `title` is kept.
- A `video` whose markup is only whitespace after sanitizing renders `data-embed-state="inert"`, not `"ready"`.
- A rich-text `colspan`, `rowspan` or `orderedList` `start` that is not a positive integer is dropped, so `NaN`, `Infinity`, zero or negative values never reach HTML. Spans above the HTML limits (1000 columns, 65534 rows) are dropped too.
- An unknown rich-text container with empty `content` keeps its (empty) children instead of showing a fallback label. A node with an empty `type` emits nothing.
- A rich-text `data:image/svg+xml` image is dropped; only png, jpeg, gif, webp and avif data URLs are admitted.
- A rich-text link with `target="_blank"` gets `rel="noopener noreferrer"`.
- An `image` or `download_card` whose media source throws, or resolves without a URL, renders inert instead of throwing. A `download_card` link admits only relative, `http`, `https` and `blob` URLs.
- A markdown child inside an `item_list` item renders through the markdown renderer, as it does at the top level.

### Changed

- `sanitizeSvgHtml` drops `style` attributes and `<style>` elements. An icon that relied on inline `style` or an embedded stylesheet must use presentation attributes or the consumer's own stylesheet.
- A `table` cell flagged as a header renders as `<th>` inside a body row, not only in an all-header group.
- The `item_list` renderer forwards `value` to its child renderers, as `NightfireRenderer` does.
- Markdown sanitization runs through one shared helper for the markdown block, table cells and the editor preview. The `renderSafeMarkdownPreview` export is unchanged.
