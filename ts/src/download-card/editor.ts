import DownloadCardEditor from "./DownloadCardEditor.svelte";
import { registerBlockEditor, registerBlockEmptyChecker } from "../editor-registry";

// Register the download-card block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "download_card", "Download card", DownloadCardEditor);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// A card is empty when no file entry carries a reference: the renderer renders
// nothing for such a block, so the checker agrees with the renderer.
registerBlockEmptyChecker("download_card", (block: unknown) => {
  const files = isRecord(block) && isRecord(block.data) ? block.data.files : null;
  if (!Array.isArray(files)) {
    return true;
  }
  const entries: Array<unknown> = files;
  return !entries.some(
    (file) => isRecord(file) && typeof file.media_id === "string" && file.media_id.trim().length > 0
  );
});
