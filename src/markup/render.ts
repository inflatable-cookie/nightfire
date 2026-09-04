import MarkdownRenderer from "./MarkdownRenderer.svelte";
import { registerBlockRenderer } from "../render-registry";

// Block renderer for generic markdown content.

registerBlockRenderer(null, "markdown", MarkdownRenderer);
