import VideoEditor from "./VideoEditor.svelte";
import {
  registerBlockEditor,
  registerBlockEmptyChecker
} from "../editor-registry";

// Register the video block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "video", "Video", VideoEditor);

// A video is empty when it carries no addressable embed: the renderer renders
// nothing for such a block, so the checker agrees with the renderer.
registerBlockEmptyChecker("video", (block) => {
  const embed = block?.data?.embed;
  return (
    !embed ||
    typeof embed !== "object" ||
    typeof (embed as { provider?: unknown }).provider !== "string" ||
    ((embed as { provider: string }).provider.length === 0) ||
    typeof (embed as { id?: unknown }).id !== "string" ||
    ((embed as { id: string }).id.length === 0)
  );
});
