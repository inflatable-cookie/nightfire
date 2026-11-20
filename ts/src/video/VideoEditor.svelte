<script lang="ts">
  import { createStableId } from "../dom";
  import { untrack } from "svelte";
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
    id?: string;
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
  const inputId = createStableId("nightfire-video");

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

  function sameEmbed(a: ParsedEmbed | null, b: ParsedEmbed | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
      a.provider === b.provider &&
      a.id === b.id &&
      (a.originalUrl ?? undefined) === (b.originalUrl ?? undefined) &&
      (a.originalEmbed ?? undefined) === (b.originalEmbed ?? undefined)
    );
  }

  const initialEmbed = untrack(() => storedEmbed(block?.data?.embed));
  let url = $state(initialEmbed?.originalUrl ?? "");
  let pendingEmbed = $state<ParsedEmbed | null | undefined>(undefined);
  let lastEmitted: ParsedEmbed | null = initialEmbed;
  let observedEmbed: ParsedEmbed | null = initialEmbed;

  $effect(() => {
    const current = embed;
    if (!sameEmbed(current, observedEmbed)) {
      if (!sameEmbed(current, lastEmitted)) {
        url = typeof current?.originalUrl === "string" ? current.originalUrl : "";
      }
      pendingEmbed = undefined;
      observedEmbed = current;
    }
  });

  function emit(current: ParsedEmbed | null, nextTitle: string, nextCaption: string) {
    lastEmitted = current;
    onChange({
      ...(block.id !== undefined ? { id: block.id } : {}),
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
    if (parsed && url.trim()) {
      pendingEmbed = parsed;
      emit(parsed, title, caption);
      return;
    }
    // Unparseable: Poodle shows the error; the block is left unchanged, so no
    // partial embed is ever stored.
    if (error) {
      pendingEmbed = undefined;
      return;
    }
    // Cleared input: drop the embed, keep the author's title and caption.
    pendingEmbed = null;
    if (embed) emit(null, title, caption);
  }
</script>

<div class="underlay-video-editor">
  <EmbedInput
    id={`${inputId}-url`}
    value={url}
    {providers}
    {parseDebounce}
    onValueChange={(nextValue) => {
      const changed = nextValue !== url;
      url = nextValue;
      if (!nextValue.trim()) {
        pendingEmbed = null;
      } else if (changed) {
        pendingEmbed = undefined;
      }
    }}
    onParse={handleParse}
  />

  <div class="underlay-video-editor__meta">
    <TextInput
      id={`${inputId}-title`}
      placeholder="Title (optional, used as the embed's accessible name)"
      value={title}
      onValueChange={(nextValue) => emit(pendingEmbed !== undefined ? pendingEmbed : embed, nextValue, caption)}
    />
    <TextInput
      id={`${inputId}-caption`}
      placeholder="Caption (optional)"
      value={caption}
      onValueChange={(nextValue) => emit(pendingEmbed !== undefined ? pendingEmbed : embed, title, nextValue)}
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
