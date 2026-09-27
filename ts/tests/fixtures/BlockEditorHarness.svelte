<script lang="ts">
  import { untrack, type Component } from "svelte";

  interface Props {
    Editor: Component<any>;
    initialBlock: Record<string, unknown>;
    editorProps?: Record<string, unknown>;
  }

  let { Editor, initialBlock, editorProps = {} }: Props = $props();
  let block = $state(untrack(() => structuredClone(initialBlock)));
</script>

<Editor {...editorProps} {block} onChange={(next: Record<string, unknown>) => (block = next)} />
<pre data-testid="stored-block">{JSON.stringify(block)}</pre>
