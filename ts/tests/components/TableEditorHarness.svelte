<script lang="ts">
  import TableEditor from "../../src/layout/TableEditor.svelte";

  type TableBlockProp = Record<string, unknown>;

  let {
    initial,
    onChange = () => {}
  }: { initial: TableBlockProp; onChange?: (block: TableBlockProp) => void } = $props();
  let block = $state(initial);

  // Feed edits back into the block, the way a controlled host would, so the
  // rendered grid follows structural changes made from the keyboard.
  function handleChange(next: TableBlockProp) {
    block = next;
    onChange(next);
  }

  export function setBlock(next: TableBlockProp) {
    block = next;
  }
</script>

<TableEditor {block} onChange={handleChange} />
