<script lang="ts">
  // Generic item-list renderer.
  //
  // Each item's body carries CHILD NIGHTFIRE BLOCKS, and each child renders through
  // its own renderer from the registry. That is what makes this block more than a
  // styled list: an item's body is content with its own sub-interface, not a string.
  //
  // The same styling rule as every other renderer applies: semantic markup, a
  // `data-nightfire-block` hook, no scoped styles.
  import { getBlockRenderer } from "../render-registry";
  import type { BlockRendererComponent } from "../render-registry";

  type ChildBlock = { type: string; data?: unknown; version?: string };

  type Item = { title?: string | null; body?: unknown };

  type ItemListBlock = {
    data?: {
      title?: string | null;
      intro?: unknown;
      variant?: string;
      items?: Item[];
    };
  };

  interface Props {
    block: ItemListBlock;
    schema?: string;
  }

  let { block, schema }: Props = $props();

  const title = $derived(typeof block?.data?.title === "string" ? block.data.title : "");
  const variant = $derived(typeof block?.data?.variant === "string" ? block.data.variant : "");
  const items = $derived(Array.isArray(block?.data?.items) ? block.data.items : []);

  // An item body holds one or more child blocks. A bare object is treated as a single
  // block; an array is a child sequence. Anything else contributes no children.
  function childBlocks(body: unknown): ChildBlock[] {
    if (Array.isArray(body)) return body.filter((entry): entry is ChildBlock => isBlock(entry));
    if (isBlock(body)) return [body];
    return [];
  }

  function isBlock(value: unknown): value is ChildBlock {
    return (
      value !== null &&
      typeof value === "object" &&
      typeof (value as { type?: unknown }).type === "string"
    );
  }

  function rendererFor(child: ChildBlock): BlockRendererComponent | null {
    return getBlockRenderer(schema, child.type);
  }

  // A variant selects presentation only. Ordered variants render as an ordered list;
  // anything else renders as an unordered one, so an unknown variant degrades to the
  // safe structure instead of failing to render.
  const ordered = $derived(/order|number|step|sequence/i.test(variant));
</script>

{#if items.length > 0}
  <div data-nightfire-block="item_list" data-item-list-variant={variant || undefined}>
    {#if title}
      <p data-item-list-title>{title}</p>
    {/if}
    <svelte:element this={ordered ? "ol" : "ul"} data-item-list-items>
      {#each items as item, index (index)}
        <li data-item-list-item>
          {#if typeof item?.title === "string" && item.title.length > 0}
            <p data-item-list-item-title>{item.title}</p>
          {/if}
          {#each childBlocks(item?.body) as child, childIndex (childIndex)}
            {#if rendererFor(child)}
              {@const Child = rendererFor(child)}
              <Child block={child} {schema} />
            {/if}
          {/each}
        </li>
      {/each}
    </svelte:element>
  </div>
{/if}
