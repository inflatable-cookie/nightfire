// Video embed markup. Port of Poodle 0.4.4 `renderEmbed` from
// `packages/core/src/embed-input.ts`. Provenance is recorded in PROVENANCE.md.
//
// The stored shape is still Poodle's `ParsedEmbed`. This module only turns an
// already-parsed embed into iframe markup; URL parsing stays in the editor.

export type RenderableEmbed = {
  provider: string;
  id: string;
  originalEmbed?: string;
};

/**
 * Turn a stored embed into iframe markup. A pasted `originalEmbed` wins;
 * otherwise the provider allow-list is youtube, vimeo, and audioboom.
 * Anything else yields null and the renderer stays inert.
 *
 * The id is a path segment of the provider URL, so it is percent-encoded. A
 * crafted id cannot end the `src` value or add attributes to the iframe.
 */
export function renderEmbed(
  embed: Pick<RenderableEmbed, "provider" | "id" | "originalEmbed">
): string | null {
  if (embed.originalEmbed) {
    return embed.originalEmbed;
  }

  const id = encodeURIComponent(embed.id);
  switch (embed.provider) {
    case "youtube":
      return `<iframe src="https://www.youtube.com/embed/${id}" loading="lazy" allowfullscreen></iframe>`;
    case "vimeo":
      return `<iframe src="https://player.vimeo.com/video/${id}" loading="lazy" allowfullscreen></iframe>`;
    case "audioboom":
      return `<iframe src="https://embeds.audioboom.com/posts/${id}/embed/v5" loading="lazy"></iframe>`;
    default:
      return null;
  }
}
