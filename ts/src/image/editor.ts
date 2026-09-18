import ImageEditor from "./ImageEditor.svelte";
import {
  registerBlockEditor,
  registerBlockEmptyChecker
} from "../editor-registry";

// Register the image block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "image", "Image", ImageEditor);

// An image is empty when it carries no reference: the renderer renders nothing
// for such a block, so the checker agrees with the renderer.
registerBlockEmptyChecker("image", (block) => {
  const mediaId = block?.data?.media_id;
  return (
    typeof mediaId !== "string" || mediaId.trim().length === 0
  );
});
