/**
 * Context injection for the Nightfire media block editor.
 *
 * The generic media editor needs application-specific API callbacks to open a
 * media picker. Consuming apps configure a context provider at their boundary,
 * following the same pattern as NightfireStrategies.
 */

import { getContext, setContext } from "svelte";

/** Result returned by the media picker when the user selects an item. */
export interface NightfireMediaPickResult {
  id: string;
  thumbnailUrl: string | null;
  title: string | null;
  originalFilename?: string | null;
  kind: string;
}

/** Context contract for opening a media picker from block editors. */
export interface NightfireMediaContext {
  /**
   * Open the media picker dialog.
   * Resolves with the selected media item, or `null` if the user cancels.
   */
  pickMedia: (options?: {
    filterKind?: string;
  }) => Promise<NightfireMediaPickResult | null>;
}

const CONTEXT_KEY = Symbol("nightfire-media");

/**
 * Set up the Nightfire media context.
 * Call this in your root layout component alongside strategy context.
 */
export function createNightfireMediaContext(
  ctx: NightfireMediaContext
): void {
  setContext(CONTEXT_KEY, ctx);
}

/**
 * Retrieve the Nightfire media context.
 * Returns `null` if no context has been provided (graceful degradation).
 */
export function useNightfireMedia(): NightfireMediaContext | null {
  try {
    return getContext<NightfireMediaContext>(CONTEXT_KEY) ?? null;
  } catch {
    return null;
  }
}
