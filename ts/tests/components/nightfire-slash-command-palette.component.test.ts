import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "../render";
import SlashCommandPalette from "../../src/SlashCommandPalette.svelte";
import type { NightfireSlashCommand } from "../../src/editor";

const commands: Array<NightfireSlashCommand> = [
  {
    id: "insert-heading",
    type: "heading",
    label: "Heading",
    description: "Insert a heading block.",
    aliases: ["h1"],
    keywords: ["title"]
  },
  {
    id: "insert-download_card",
    type: "download_card",
    label: "Download card",
    description: "Insert a download card block.",
    aliases: ["file"],
    keywords: ["attachment"]
  }
];

describe("nightfire/SlashCommandPalette.svelte", () => {
  it("filters commands and emits the selected command with keyboard navigation", async () => {
    const selected = mock();
    const queryChanges = mock();

    render(SlashCommandPalette, {
      commands,
      query: "",
      onQueryChange: queryChanges,
      onSelect: selected
    });

    const input = screen.getByLabelText<HTMLInputElement>("Filter commands");
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const optionItems = Array.from(document.querySelectorAll('[role="listbox"] > li'));
    expect(optionItems.length).toBe(2);
    for (const item of optionItems) {
      expect(item.getAttribute("role")).toBe("presentation");
    }

    await fireEvent.input(input, { target: { value: "atta" } });
    expect(queryChanges).toHaveBeenCalledWith("atta");

    await fireEvent.keyDown(input, { key: "ArrowDown" });
    await fireEvent.keyDown(input, { key: "Enter" });

    expect(selected).toHaveBeenCalledWith(commands[1]);
  });

  it("keeps focus on the combobox so Enter activates only the tracked option", async () => {
    const selected = mock();

    render(SlashCommandPalette, {
      commands,
      query: "",
      onQueryChange: mock(),
      onSelect: selected
    });

    const input = screen.getByLabelText<HTMLInputElement>("Filter commands");
    const options = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    expect(options).toHaveLength(2);
    // Options stay out of the tab order: the combobox owns the keyboard.
    for (const option of options) {
      expect(option.tabIndex).toBe(-1);
    }

    await fireEvent.focus(options[1]!);
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1]!.id);

    // Enter inside an option does not run the palette's own selection: the
    // button activates natively, and only the combobox tracks `selectedIndex`.
    await fireEvent.keyDown(options[1]!, { key: "Enter" });
    expect(selected).not.toHaveBeenCalled();

    await fireEvent.keyDown(input, { key: "Enter" });
    expect(selected).toHaveBeenCalledWith(commands[1]);
  });

  it("renders an empty state and closes on escape", async () => {
    const onClose = mock();

    render(SlashCommandPalette, {
      commands: [],
      query: "missing",
      onSelect: mock(),
      onClose
    });

    const input = screen.getByLabelText("Filter commands");
    expect(screen.getByText("No matching commands.")).toBeTruthy();

    await fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
