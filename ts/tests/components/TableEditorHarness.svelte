<script lang="ts">
  import TableEditor from "../../src/layout/TableEditor.svelte";

  type TableBlockProp = Record<string, unknown>;

  let {
    initial,
    onChange = () => {}
  }: { initial: TableBlockProp; onChange?: (block: TableBlockProp) => void } = $props();
  let block = $state(initial);

  export function setBlock(next: TableBlockProp) {
    block = next;
  }
</script>

<TableEditor {block} {onChange} />
