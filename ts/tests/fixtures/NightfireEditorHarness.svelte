<script lang="ts">
  import { untrack } from "svelte";
  import NightfireEditor from "../../src/NightfireEditor.svelte";
  import type {
    NightfireBlockOptionInput,
    NightfireSlashCommandsConfig,
    NightfireValue
  } from "../../src/editor";
  import type { SchemaMismatchInfo } from "../../src/editor";

  interface Props {
    schema?: string;
    initialValue?: NightfireValue;
    modeOverride?: "single" | "multi" | null;
    defaultTypeOverride?: string | null;
    blockOptions?: Array<NightfireBlockOptionInput> | null;
    required?: boolean;
    slashCommands?: NightfireSlashCommandsConfig | null;
    onChange?: ((value: NightfireValue) => void) | null;
    onSchemaMismatch?: ((info: SchemaMismatchInfo) => void) | null;
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
    slashCommands = null,
    onChange = null,
    onSchemaMismatch = null
  }: Props = $props();

  let value = $state(untrack(() => structuredClone(initialValue)));

  // Lets a test hand the editor an externally produced value, the way a host
  // form would after an API response.
  export function setValue(next: NightfireValue) {
    value = next;
  }

  // Swaps the field's schema the way a host renders a different field into the
  // same editor instance.
  export function setSchema(next: string) {
    schema = next;
  }
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
  onChange={onChange ?? undefined}
  onSchemaMismatch={onSchemaMismatch ?? undefined}
/>

<pre data-testid="nightfire-value">{JSON.stringify(value, null, 2)}</pre>
