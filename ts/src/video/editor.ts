import VideoEditor from "./VideoEditor.svelte";
import { registerBlockEditor, registerBlockEmptyChecker } from "../editor-registry";

// Register the video block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "video", "Video", VideoEditor);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// A video is empty when it carries no addressable embed: the renderer renders
// nothing for such a block, so the checker agrees with the renderer.
registerBlockEmptyChecker("video", (block: unknown) => {
  const embed = isRecord(block) && isRecord(block.data) ? block.data.embed : null;
  return (
    !isRecord(embed) ||
    typeof embed.provider !== "string" ||
    embed.provider.length === 0 ||
    typeof embed.id !== "string" ||
    embed.id.length === 0
  );
});
