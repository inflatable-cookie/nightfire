import VideoRenderer from "./VideoRenderer.svelte";
import { registerBlockRenderer } from "../render-registry";

// Block renderer for the generic video embed. `renderEmbed` is Nightfire's
// port of Poodle's renderer and its markup is sanitized before `{@html}`;
// editor code lives outside this graph.

registerBlockRenderer(null, "video", VideoRenderer);
