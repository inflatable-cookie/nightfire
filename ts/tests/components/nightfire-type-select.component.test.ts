import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "../render";

import NightfireTypeSelect from "../../src/editor/NightfireTypeSelect.svelte";
import type { GroupedOptions } from "../../src/editor/grouped-options";

const groupedOptions: GroupedOptions[] = [
  {
    category: "Interactive",
    label: "Interactive",
    options: [
      { type: "question.multiple", label: "Question - Multiple choice", category: "Interactive", subcategory: "multipleChoice" },
      { type: "question.other", label: "Question - Other", category: "Interactive", subcategory: "other" },
    ],
  },
  {
    category: "Text",
    label: "Text",
    options: [{ type: "markdown", label: "Markdown", category: "Text" }],
  },
];

describe("nightfire/editor NightfireTypeSelect", () => {
  it("renders the consumer's labels and group order without rewriting either", async () => {
    render(NightfireTypeSelect, {
      value: "markdown",
      groupedOptions,
      typeOptions: [{ type: "markdown", label: "Markdown" }],
      onChange: mock(),
    });

    await fireEvent.click(screen.getByRole("combobox", { name: "Block type" }));

    const names = screen.getAllByRole("option").map((option) => option.textContent?.trim());
    expect(names).toEqual([
      "Question - Multiple choice",
      "Question - Other",
      "Markdown",
    ]);
  });

  it("falls back to the flat type options when no groups are given", async () => {
    const onChange = mock();
    render(NightfireTypeSelect, {
      value: "a",
      groupedOptions: null,
      typeOptions: [
        { type: "a", label: "Question - Stays as given" },
        { type: "b", label: "Beta" },
      ],
      onChange,
    });

    await fireEvent.change(screen.getByRole("combobox", { name: "Block type" }), {
      target: { value: "b" },
    });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("b"));
  });
});
