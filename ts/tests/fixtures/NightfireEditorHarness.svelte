<script lang="ts">
  import { untrack } from "svelte";
  import NightfireEditor from "../../src/NightfireEditor.svelte";
  import type {
    NightfireBlockOptionInput,
    NightfireSlashCommandsConfig,
    NightfireValue
  } from "../../src/editor";

  interface Props {
    schema?: string;
    initialValue?: NightfireValue;
    modeOverride?: "single" | "multi" | null;
    defaultTypeOverride?: string | null;
    blockOptions?: NightfireBlockOptionInput[] | null;
    required?: boolean;
    slashCommands?: NightfireSlashCommandsConfig | null;
  }

  let {
    schema = "example:content/markup",
    initialValue = {
      schema: "example:content/markup",
      blocks: [
        {
          type: "markdown",
          version: "initial",
          data: {
            text: ""
          }
        }
      ]
    },
    modeOverride = null,
    defaultTypeOverride = null,
    blockOptions = null,
    required = false,
    slashCommands = null
  }: Props = $props();

  let value = $state(untrack(() => structuredClone(initialValue)));
</script>

<NightfireEditor
  name="body"
  {schema}
  bind:value
  {modeOverride}
  {defaultTypeOverride}
  {blockOptions}
  {required}
  {slashCommands}
/>

<pre data-testid="nightfire-value">{JSON.stringify(value, null, 2)}</pre>
