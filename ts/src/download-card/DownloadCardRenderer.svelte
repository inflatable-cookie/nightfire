<script lang="ts">
  // Generic download-card renderer.
  //
  // Each file is a reference into the consumer's media library, resolved
  // synchronously through the media-source registry — no editor module in
  // this graph, no Svelte context, no suspending. A missing source or an
  // unknown reference renders the row inert and marked; it never throws and
  // never hides the description the author wrote.
  //
  // The same styling rule as every other renderer applies: semantic markup, a
  // `data-nightfire-block` hook, data attributes for structure, no scoped
  // styles, no class of our own, no token.
  import { getMediaSource, type ResolvedMedia } from "../media-source";

  type CardFile = { media_id?: unknown; description?: unknown };

  type DownloadCardBlock = {
    data?: {
      description?: unknown;
      files?: CardFile[];
    };
  };

  interface Props {
    block: DownloadCardBlock;
  }

  let { block }: Props = $props();

  const description = $derived(
    typeof block?.data?.description === "string" && block.data.description.length > 0
      ? block.data.description
      : ""
  );
  // A file entry is a file when it carries a reference. Anything else is not
  // a row, so it contributes nothing rather than rendering a broken one.
  const files = $derived(
    (Array.isArray(block?.data?.files) ? block.data.files : []).filter(
      (file): file is { media_id: string; description?: unknown } =>
        file !== null &&
        typeof file === "object" &&
        typeof (file as { media_id?: unknown }).media_id === "string" &&
        ((file as { media_id: string }).media_id.trim().length > 0)
    )
  );

  function resolveReference(mediaId: string): ResolvedMedia | null {
    return getMediaSource()?.resolve({ media_id: mediaId }) ?? null;
  }

  function fileDescription(file: { description?: unknown }): string {
    return typeof file.description === "string" ? file.description : "";
  }

  function formatSize(size: number): string {
    if (!Number.isFinite(size) || size < 0) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${units[unit]}`;
  }
</script>

{#if files.length > 0}
  <div data-nightfire-block="download_card">
    {#if description}
      <p data-download-card-description>{description}</p>
    {/if}
    <ul data-download-card-files>
      {#each files as file, index (index)}
        {@const resolved = resolveReference(file.media_id)}
        {@const size = resolved && typeof resolved.size === "number" ? formatSize(resolved.size) : ""}
        <li data-download-card-file data-media-state={resolved ? "resolved" : "inert"}>
          {#if resolved}
            <a data-download-card-file-link href={resolved.url} download={resolved.filename}>
              {resolved.filename}
            </a>
            {#if resolved.mime}
              <span data-download-card-file-type>{resolved.mime}</span>
            {/if}
            {#if size}
              <span data-download-card-file-size>{size}</span>
            {/if}
          {/if}
          {#if fileDescription(file)}
            <p data-download-card-file-description>{fileDescription(file)}</p>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
