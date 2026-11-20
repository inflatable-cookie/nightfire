<script lang="ts">
  import { untrack } from "svelte";
  import NightfireEditor from "../../src/NightfireEditor.svelte";
  import { createNightfireStrategiesContext } from "../../src/strategies";
  import type { NightfireValue } from "../../src/editor";

  interface Props {
    initialSchema: string;
    nextSchema: string;
  }

  let { initialSchema, nextSchema }: Props = $props();

  createNightfireStrategiesContext();

  // The schema is state inside the harness, so a test can change the prop the
  // editor receives without remounting it.
  let schema = $state(untrack(() => initialSchema));
  let value: NightfireValue = $state({ schema: untrack(() => initialSchema), blocks: [] });
</script>

<button type="button" onclick={() => (schema = nextSchema)}>Switch schema</button>

<NightfireEditor name="body" {schema} bind:value />
