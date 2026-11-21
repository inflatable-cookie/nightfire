<script lang="ts">
  import NightfireBlockEditor from "../../src/NightfireBlockEditor.svelte";
  import type { BlockTypeOption, SchemaDefinition } from "../../src/editor-registry";

  interface Props {
    initialBlock: Record<string, unknown>;
    definition: SchemaDefinition;
    typeOptions: Array<BlockTypeOption>;
  }

  let { initialBlock, definition, typeOptions }: Props = $props();
  let block = $state(initialBlock);

  export function setBlock(next: Record<string, unknown>) {
    block = next;
  }
</script>

<NightfireBlockEditor schema={definition.schema} {block} {definition} {typeOptions} />
