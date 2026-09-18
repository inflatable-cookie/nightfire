// The core block vocabulary, declared in one place.
//
// A block type is not "core" because a component exists for it; it is core because
// this declaration says so and the catalog registers what the declaration claims.
// The declaration exists so that adding a core block with a renderer forces a
// renderer registration rather than leaving a type that is named and unusable --
// which is the failure that unused-but-declared block types already demonstrate.
//
// Capabilities are the current truth, not the ambition: flip a flag in the same
// change that registers the part, and the completeness test holds the two together.

export interface CoreBlockCapabilities {
  /** A renderer is registered for this type. */
  renderer: boolean;
  /** An editor is registered for this type. */
  editor: boolean;
  /** An empty-content checker is registered for this type. */
  emptyChecker: boolean;
}

export const CORE_BLOCK_TYPES: Readonly<Record<string, CoreBlockCapabilities>> = {
  markdown: { renderer: true, editor: true, emptyChecker: true },
  rich_text: { renderer: true, editor: true, emptyChecker: true },
  // The download card's reference field is `media_id`; an image block should
  // follow that precedent rather than inventing a second reference spelling.
  download_card: { renderer: true, editor: true, emptyChecker: true },
  table: { renderer: true, editor: true, emptyChecker: true },
  item_list: { renderer: true, editor: false, emptyChecker: false },
  image: { renderer: true, editor: true, emptyChecker: true },
  video: { renderer: true, editor: true, emptyChecker: true },
};

export type CoreBlockType = keyof typeof CORE_BLOCK_TYPES;

export const CORE_BLOCK_TYPE_NAMES = Object.keys(CORE_BLOCK_TYPES) as CoreBlockType[];
