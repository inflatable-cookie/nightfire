<script lang="ts">
  import { getBlockRenderer, type BlockRendererComponent } from "./render-registry";
  import MarkdownRenderer from "./markup/MarkdownRenderer.svelte";
  import type { NightfireValue } from "./types";

  type BlockLike = {
    type?: string;
    data?: Record<string, unknown>;
  };

  interface Props {
    value?: NightfireValue | null;
  }

  let { value = null }: Props = $props();

  function normalizeBlocks(v: NightfireValue | null): BlockLike[] {
    if (!v) return [];
    if (Array.isArray(v.blocks) && v.blocks.length > 0) {
      return v.blocks as BlockLike[];
    }
    return [];
  }

  const blocks = $derived(normalizeBlocks(value));

  function resolveRenderer(
    schema: string | null | undefined,
    type: string | undefined
  ): BlockRendererComponent | null {
    return getBlockRenderer(schema, type) ??
      (type === "markdown" ? (MarkdownRenderer as BlockRendererComponent) : null);
  }
</script>

{#if blocks.length === 0}
  <!-- No Nightfire content -->
{:else}
  {#each blocks as block}
    {#if block?.type}
      {#key `${value?.schema ?? ""}:${block.type}`}
        {#if resolveRenderer(value?.schema, block.type)}
          {@const BlockRenderer = resolveRenderer(value?.schema, block.type)}
          <BlockRenderer
            {block}
            {value}
            schema={value?.schema ?? null}
          />
        {/if}
      {/key}
    {/if}
  {/each}
{/if}
