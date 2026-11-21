<script lang="ts">
  import ItemListEditor from "../../src/layout/ItemListEditor.svelte";

  type ItemListBlockProp = Record<string, unknown>;

  let {
    initial,
    schema = "example:content/list",
    onChange = () => {}
  }: {
    initial: ItemListBlockProp;
    schema?: string;
    onChange?: (block: ItemListBlockProp) => void;
  } = $props();
  let block = $state(initial);

  // Feed edits back into the block, the way a controlled host would, so the
  // rendered list follows the structural changes the editor emits.
  function handleChange(next: ItemListBlockProp) {
    block = next;
    onChange(next);
  }

  export function setBlock(next: ItemListBlockProp) {
    block = next;
  }
</script>

<ItemListEditor {block} value={{ schema }} onChange={handleChange} />
