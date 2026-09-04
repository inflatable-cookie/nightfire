import MediaEditor from "./MediaEditor.svelte";
import {
  registerBlockEditor,
  registerBlockEmptyChecker
} from "../editor-registry";

// Register the media block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "media", "Media", MediaEditor);

registerBlockEmptyChecker("media", (block) => {
  const mediaId = block?.data?.media_id;
  return !mediaId || typeof mediaId !== "string" || mediaId.trim().length === 0;
});
