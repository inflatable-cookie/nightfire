<script lang="ts">
  import { getBlockRenderer, type BlockRendererComponent } from "./render-registry";
  import MarkdownRenderer from "./markup/MarkdownRenderer.svelte";
  import type { NightfireDraftValue } from "./types";

  type BlockLike = {
    id?: string;
    type?: string;
    data?: Record<string, unknown>;
  };

  interface Props {
    value?: NightfireDraftValue | null;
  }

  let { value = null }: Props = $props();

  function normalizeBlocks(v: NightfireDraftValue | null): BlockLike[] {
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
  {#each blocks as block, index (block.id ?? index)}
    {#if block?.type}
      {@const BlockRenderer = resolveRenderer(value?.schema, block.type)}
      {#if BlockRenderer}
        {#key `${value?.schema ?? ""}:${block.type}`}
          <BlockRenderer
            {block}
            {value}
            schema={value?.schema ?? null}
          />
        {/key}
      {/if}
    {/if}
  {/each}
{/if}
