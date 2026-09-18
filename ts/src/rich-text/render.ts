import RichTextRenderer from "./RichTextRenderer.svelte";
import { registerBlockRenderer } from "../render-registry";

// Block renderer for structured rich text. Editor code lives outside this graph.

registerBlockRenderer(null, "rich_text", RichTextRenderer);
