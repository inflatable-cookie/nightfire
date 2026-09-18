import DownloadCardRenderer from "./DownloadCardRenderer.svelte";
import { registerBlockRenderer } from "../render-registry";

// Block renderer for the generic download card. File references resolve
// through the Svelte-free media-source module; editor code lives outside this
// graph.

registerBlockRenderer(null, "download_card", DownloadCardRenderer);
