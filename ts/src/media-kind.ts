/**
 * Type of media item
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
