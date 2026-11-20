import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor, within } from "../render";

import NightfireEditorHarness from "../fixtures/NightfireEditorHarness.svelte";

describe("nightfire/NightfireEditor slash commands", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("stays inert by default", async () => {
    const view = render(NightfireEditorHarness);
    const textarea = view.container.querySelector("textarea") as HTMLTextAreaElement;

    textarea.value = "/download";
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
    await fireEvent.input(textarea);

    expect(screen.queryByRole("dialog", { name: "Slash commands" })).toBeNull();
  });

  it("opens the slash palette and inserts a new block below the active markdown block", async () => {
    const view = render(NightfireEditorHarness, {
      modeOverride: "multi",
      slashCommands: {
        enabled: true
      }
    });
    const textarea = view.container.querySelector("textarea") as HTMLTextAreaElement;

    textarea.value = "/download";
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
    await fireEvent.input(textarea);

    const dialog = await screen.findByRole("dialog", { name: "Slash commands" });
    expect(dialog).toBeTruthy();

    await fireEvent.click(within(dialog).getByRole("option", { name: /download/i }));

    await waitFor(() => {
      const payload = JSON.parse(screen.getByTestId("nightfire-value").textContent ?? "{}");
      expect(payload.blocks).toHaveLength(2);
      expect(payload.blocks[0].data.text).toBe("");
      expect(payload.blocks[1].type).toBe("download_card");
    });
  });

  it("keeps the id of the block the slash command was typed into", async () => {
    const view = render(NightfireEditorHarness, {
      modeOverride: "multi",
      slashCommands: { enabled: true },
      initialValue: {
        schema: "example:content/markup",
        blocks: [{ id: "nf_typed", type: "markdown", version: "initial", data: { text: "" } }],
      },
    });
    const textarea = view.container.querySelector("textarea") as HTMLTextAreaElement;

    textarea.value = "/download";
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
    await fireEvent.input(textarea);

    const dialog = await screen.findByRole("dialog", { name: "Slash commands" });
    await fireEvent.click(within(dialog).getByRole("option", { name: /download/i }));

    await waitFor(() => {
      const payload = JSON.parse(screen.getByTestId("nightfire-value").textContent ?? "{}");
      expect(payload.blocks[0].id).toBe("nf_typed");
      expect(payload.blocks[1].id).toMatch(/^nf_/);
    });
  });

  it("focuses the block card in the editor that inserted it, not a sibling editor", async () => {
    const firstEditor = render(NightfireEditorHarness, {
      modeOverride: "multi",
      slashCommands: { enabled: true },
      initialValue: {
        schema: "example:content/markup",
        blocks: [
          { id: "nf_first_a", type: "markdown", version: "initial", data: { text: "First" } },
          { id: "nf_first_b", type: "markdown", version: "initial", data: { text: "Second" } },
        ],
      },
    });
    const secondEditor = render(NightfireEditorHarness, {
      modeOverride: "multi",
      slashCommands: { enabled: true },
      initialValue: {
        schema: "example:content/markup",
        blocks: [
          { id: "nf_second_a", type: "markdown", version: "initial", data: { text: "/download" } },
          { id: "nf_second_b", type: "markdown", version: "initial", data: { text: "Other" } },
        ],
      },
    });

    const textarea = secondEditor.container.querySelector("textarea") as HTMLTextAreaElement;
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
    await fireEvent.input(textarea);

    const dialog = await within(secondEditor.container).findByRole("dialog", {
      name: "Slash commands",
    });
    await fireEvent.click(within(dialog).getByRole("option", { name: /download/i }));

    await waitFor(() => {
      const insertedCard = secondEditor.container.querySelector(
        "[data-nightfire-block-card][data-block-index='1']",
      ) as HTMLElement;
      expect(insertedCard.contains(document.activeElement)).toBe(true);
    });
    expect(firstEditor.container.contains(document.activeElement)).toBe(false);
  });
});
