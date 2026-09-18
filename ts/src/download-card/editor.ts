import DownloadCardEditor from "./DownloadCardEditor.svelte";
import {
  registerBlockEditor,
  registerBlockEmptyChecker
} from "../editor-registry";

// Register the download-card block editor as a generic option for schemas that allow it.
registerBlockEditor(null, "download_card", "Download card", DownloadCardEditor);

// A card is empty when no file entry carries a reference: the renderer renders
// nothing for such a block, so the checker agrees with the renderer.
registerBlockEmptyChecker("download_card", (block) => {
  const files = block?.data?.files;
  if (!Array.isArray(files)) return true;
  return !files.some(
    (file) =>
      file !== null &&
      typeof file === "object" &&
      typeof file.media_id === "string" &&
      file.media_id.trim().length > 0
  );
});
