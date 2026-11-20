<script lang="ts">
  import { Select } from "@inflatable-cookie/poodle-svelte";
  import type { SelectItems, SelectOptionGroup } from "@inflatable-cookie/poodle-svelte/types";
  import type { GroupedOptions, NightfireBlockOptionInput } from "./grouped-options";

  type TypeOption = Pick<NightfireBlockOptionInput, "type" | "label">;

  interface Props {
    value?: string;
    groupedOptions?: Array<GroupedOptions> | null;
    typeOptions?: Array<TypeOption>;
    onChange: (value: string) => void;
    variant?: "default" | "ghost";
    menuMinWidth?: string | null;
  }

  let {
    value,
    groupedOptions = null,
    typeOptions = [],
    onChange,
    variant = "default",
    menuMinWidth = null
  }: Props = $props();

  function formatSubgroupLabel(input: string): string {
    return input
      .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replaceAll(/[_-]/g, " ")
      .trim();
  }

  const items = $derived(
    typeOptions.map((opt) => ({ value: opt.type, label: opt.label }))
  );

  // Lays out the groups `groupedOptions` already ordered, without re-sorting:
  // each group's options come first, then one group per subcategory.
  const options = $derived.by<SelectItems>(() => {
    if (!groupedOptions?.length) {return items;}

    const renderedGroups: Array<SelectOptionGroup> = [];

    for (const group of groupedOptions) {
      const subgroups = new Map<string, Array<{ value: string; label: string }>>();
      const directItems: Array<{ value: string; label: string }> = [];

      for (const option of group.options) {
        const item = { value: option.type, label: option.label };
        if (option.subcategory) {
          const existing = subgroups.get(option.subcategory) ?? [];
          existing.push(item);
          subgroups.set(option.subcategory, existing);
        } else {
          directItems.push(item);
        }
      }

      if (directItems.length) {
        renderedGroups.push({ label: group.label, options: directItems });
      }

      for (const [subcategory, subgroupItems] of subgroups) {
        renderedGroups.push({
          label: `${group.label} / ${formatSubgroupLabel(subcategory)}`,
          options: subgroupItems,
        });
      }
    }

    return renderedGroups.length ? renderedGroups : items;
  });
</script>

<Select
  value={value ?? ""}
  {options}
  ariaLabel="Block type"
  {variant}
  {menuMinWidth}
  onValueChange={onChange}
/>
