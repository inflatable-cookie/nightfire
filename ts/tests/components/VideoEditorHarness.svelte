<script lang="ts">
  import VideoEditor from "../../src/video/VideoEditor.svelte";
  let { initial, onChange }: { initial: any; onChange: (block: any) => void } = $props();
  let block = $state(initial);
  export function setBlock(next: any) { block = next; }
</script>
<VideoEditor {block} {onChange} parseDebounce={0} />
