// The media-source registry: the one seam from a Nightfire block to a
// consumer's media library.
//
// Two constraints make it usable where it is needed:
//
// - Module-level, not a Svelte context. A renderer resolves references too,
//   and a context provider is unreachable from a renderer.
// - `resolve` is synchronous. A renderer renders synchronously and must work
//   under SSR, so the consumer resolves over metadata it has already loaded.
//   An unknown reference renders inert rather than suspending.
//
// This module must import neither Svelte nor any editor module: both the
// editor and the renderer sit on top of it.

/**
 * Type of media item. A picker may filter on it; a download row may use it
 * to choose a file icon.
 */
export const MediaKind = {
  Image: "image",
  Video: "video",
  Audio: "audio",
  Document: "document",
  Pdf: "pdf",
  Other: "other"
} as const;

export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

/**
 * A reference to a file the consumer's media library holds. Block data stores
 * the reference, never the resolved file facts.
 */
export interface MediaReference {
  media_id: string;
}

/**
 * What a download row needs to render: at least the URL and filename,
 * optionally the size and MIME type. An image reads `url` plus the
 * intrinsic `width`/`height` and the library-held `title`, and ignores the
 * download fields; a download row does the reverse. One source serves both.
 */
export interface ResolvedMedia {
  url: string;
  filename: string;
  size?: number;
  mime?: string;
  /** Intrinsic width in pixels, when the library knows it. Used, not stored. */
  width?: number;
  /** Intrinsic height in pixels, when the library knows it. Used, not stored. */
  height?: number;
  /** Library-held title, when the library knows it. The block's own title wins. */
  title?: string;
}

export interface MediaSource {
  /**
   * Open the consumer's picker. Resolves with the picked references, or
   * `null` when the user cancels. `filterKind` is a hint the picker may use
   * to show only that kind; a picker that cannot filter ignores it.
   */
  pick(options: { multiple: boolean; filterKind?: MediaKind }): Promise<MediaReference[] | null>;
  /**
   * Resolve a reference over metadata the consumer has already loaded.
   * Returns `null` for a reference the source does not know.
   */
  resolve(reference: MediaReference): ResolvedMedia | null;
}

let mediaSource: MediaSource | null = null;

/**
 * Register the media source. Replaces any previously registered source;
 * the registry holds one source at a time.
 */
export function registerMediaSource(source: MediaSource): void {
  mediaSource = source;
}

/**
 * The registered media source, or `null` when the consumer has registered
 * none. Blocks render inert without one.
 */
export function getMediaSource(): MediaSource | null {
  return mediaSource;
}

/**
 * Remove the registered source. The test seam for proving a block renders
 * inert rather than throwing once the consumer stops providing one.
 */
export function unregisterMediaSource(): void {
  mediaSource = null;
}
