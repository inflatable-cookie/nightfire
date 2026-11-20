// The registry-backed host function behind Poodle's image insert command.
//
// The rich-text image node takes `{ src, alt, title }` while Nightfire holds a
// library reference, so this bridges the two: pick an image reference through
// the registered media source and resolve it to a URL. With no source
// registered there is no host function, and Poodle's own toolbar behaviour
// leaves the insert command out.
//
// This module is Svelte-free and editor-side only: the render catalog must
// never reach it.

import type { RichTextImageInput } from "@inflatable-cookie/poodle-svelte/rich-text";
import { MediaKind, getMediaSource } from "../media-source";

/**
 * Build Poodle's `requestImage` from the registered media source, or return
 * `null` when the consumer registered none.
 */
export function createRichTextImageRequest(): (() => Promise<RichTextImageInput | null>) | null {
  const source = getMediaSource();
  if (!source) return null;

  return async () => {
    try {
      const picked = await source.pick({ multiple: false, filterKind: MediaKind.Image });
      const first = Array.isArray(picked)
        ? picked.find(
            (reference) =>
              reference !== null &&
              typeof reference === "object" &&
              typeof reference.media_id === "string" &&
              reference.media_id.trim().length > 0
          )
        : undefined;
      if (!first) return null;

      const resolved = source.resolve(first);
      if (!resolved || typeof resolved.url !== "string" || resolved.url.trim().length === 0) {
        return null;
      }

      return {
        src: resolved.url,
        alt: "",
        title: typeof resolved.title === "string" ? resolved.title : null
      };
    } catch {
      return null;
    }
  };
}
