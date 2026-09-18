// @vitest-environment jsdom
import { describe, expect, it, vi } from "../vitest";
import { fireEvent, render, screen } from "../render";
import SlashCommandPalette from "../../src/SlashCommandPalette.svelte";
import type { NightfireSlashCommand } from "../../src/editor";

const commands: NightfireSlashCommand[] = [
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
    const selected = vi.fn();
    const queryChanges = vi.fn();

    render(SlashCommandPalette, {
      commands,
      query: "",
      onQueryChange: queryChanges,
      onSelect: selected
    });

    const input = screen.getByLabelText("Filter commands") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "atta" } });
    expect(queryChanges).toHaveBeenCalledWith("atta");

    await fireEvent.keyDown(input, { key: "ArrowDown" });
    await fireEvent.keyDown(input, { key: "Enter" });

    expect(selected).toHaveBeenCalledWith(commands[1]);
  });

  it("renders an empty state and closes on escape", async () => {
    const onClose = vi.fn();

    render(SlashCommandPalette, {
      commands: [],
      query: "missing",
      onSelect: vi.fn(),
      onClose
    });

    const input = screen.getByLabelText("Filter commands");
    expect(screen.getByText("No matching commands.")).toBeTruthy();

    await fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
