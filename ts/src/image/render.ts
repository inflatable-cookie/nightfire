import ImageRenderer from "./ImageRenderer.svelte";
import { registerBlockRenderer } from "../render-registry";

// Block renderer for the generic image. The reference resolves through the
// Svelte-free media-source module; editor code lives outside this graph.

registerBlockRenderer(null, "image", ImageRenderer);
