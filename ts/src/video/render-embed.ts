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
 */
export function renderEmbed(
  embed: Pick<RenderableEmbed, "provider" | "id" | "originalEmbed">
): string | null {
  if (embed.originalEmbed) {
    return embed.originalEmbed;
  }

  switch (embed.provider) {
    case "youtube":
      return `<iframe src="https://www.youtube.com/embed/${embed.id}" loading="lazy" allowfullscreen></iframe>`;
    case "vimeo":
      return `<iframe src="https://player.vimeo.com/video/${embed.id}" loading="lazy" allowfullscreen></iframe>`;
    case "audioboom":
      return `<iframe src="https://embeds.audioboom.com/posts/${embed.id}/embed/v5" loading="lazy"></iframe>`;
    default:
      return null;
  }
}
