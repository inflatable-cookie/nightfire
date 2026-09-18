<script lang="ts">
  // Generic video editor.
  //
  // The author pastes a URL or embed code into Poodle's `EmbedInput`, which
  // parses it into Poodle's own `ParsedEmbed` and shows the detected provider.
  // The admitted provider set is Poodle's: the optional `providers` prop is
  // the consumer's allow-list, passed straight through, and nothing under this
  // package defines a provider list, a parser, or an embed shape.
  //
  // An unparseable value stores nothing rather than a partial embed: Poodle
  // surfaces the parse error and the block is left unchanged. Clearing the
  // input drops the embed and keeps the title and caption the author already
  // wrote, so re-pasting a URL does not cost retyping.
  import {
    EmbedInput,
    TextInput,
    type ParsedEmbed
  } from "@inflatable-cookie/poodle-svelte";

  type VideoBlock = {
    type?: string;
    version?: string;
    data?: {
      embed?: ParsedEmbed;
      title?: string;
      caption?: string;
    };
  };

  interface Props {
    block: VideoBlock;
    onChange: (block: VideoBlock) => void;
    /**
     * Consumer-supplied provider allow-list, passed straight to `EmbedInput`.
     * Absent means Poodle's full supported set.
     */
    providers?: string[];
    /** Parse debounce in milliseconds, passed straight to `EmbedInput`. */
    parseDebounce?: number;
  }

  let { block, onChange, providers, parseDebounce }: Props = $props();

  function storedEmbed(value: unknown): ParsedEmbed | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as { provider?: unknown; id?: unknown };
    if (typeof candidate.provider !== "string" || candidate.provider.length === 0) {
      return null;
    }
    if (typeof candidate.id !== "string" || candidate.id.length === 0) return null;
    return value as ParsedEmbed;
  }

  const embed = $derived(storedEmbed(block?.data?.embed));
  const title = $derived(typeof block?.data?.title === "string" ? block.data.title : "");
  const caption = $derived(
    typeof block?.data?.caption === "string" ? block.data.caption : ""
  );

  // The input starts from the stored embed's own URL so save and reload
  // round-trip; afterwards it is the author's in-progress text, never
  // clobbered by the parent echoing the emitted block back.
  const initialUrl =
    block?.data?.embed && typeof block.data.embed.originalUrl === "string"
      ? block.data.embed.originalUrl
      : "";
  let url = $state(initialUrl);
  let lastParsed = $state<ParsedEmbed | null>(null);

  function emit(current: ParsedEmbed | null, nextTitle: string, nextCaption: string) {
    onChange({
      type: block?.type ?? "video",
      version: block?.version ?? "initial",
      data: {
        ...(current ? { embed: current } : {}),
        ...(nextTitle.length > 0 ? { title: nextTitle } : {}),
        ...(nextCaption.length > 0 ? { caption: nextCaption } : {})
      }
    });
  }

  function handleParse(parsed: ParsedEmbed | null, error: string | null) {
    if (parsed) {
      lastParsed = parsed;
      emit(parsed, title, caption);
      return;
    }
    // Unparseable: Poodle shows the error; the block is left unchanged, so no
    // partial embed is ever stored.
    if (error) return;
    // Cleared input: drop the embed, keep the author's title and caption.
    if (embed) {
      lastParsed = null;
      emit(null, title, caption);
    }
  }
</script>

<div class="underlay-video-editor">
  <EmbedInput
    id="nightfire-video-url"
    value={url}
    {providers}
    {parseDebounce}
    onValueChange={(nextValue) => {
      url = nextValue;
    }}
    onParse={handleParse}
  />

  <div class="underlay-video-editor__meta">
    <TextInput
      id="nightfire-video-title"
      placeholder="Title (optional, used as the embed's accessible name)"
      value={title}
      onValueChange={(nextValue) => emit(lastParsed ?? embed, nextValue, caption)}
    />
    <TextInput
      id="nightfire-video-caption"
      placeholder="Caption (optional)"
      value={caption}
      onValueChange={(nextValue) => emit(lastParsed ?? embed, title, nextValue)}
    />
  </div>
</div>

<style>
  .underlay-video-editor {
    display: grid;
    gap: var(--nightfire-space-3);
  }

  .underlay-video-editor__meta {
    display: grid;
    gap: var(--nightfire-space-2);
  }
</style>
