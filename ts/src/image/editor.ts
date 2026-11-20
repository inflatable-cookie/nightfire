import ImageEditor from "./ImageEditor.svelte";
import { registerBlockEditor, registerBlockEmptyChecker } from "../editor-registry";

// Register the image block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "image", "Image", ImageEditor);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// An image is empty when it carries no reference: the renderer renders nothing
// for such a block, so the checker agrees with the renderer.
registerBlockEmptyChecker("image", (block: unknown) => {
  const mediaId = isRecord(block) && isRecord(block.data) ? block.data.media_id : null;
  return typeof mediaId !== "string" || mediaId.trim().length === 0;
});
