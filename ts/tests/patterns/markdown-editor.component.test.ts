import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "../render";
import MarkdownEditorHarness from "../fixtures/MarkdownEditorHarness.svelte";
import MarkdownEditorSurface from "../../src/markup/MarkdownEditorSurface.svelte";

describe("nightfire/markup/MarkdownEditorSurface.svelte", () => {
  it("renders textarea mode with label/hint and updates bound value", async () => {
    const onChange = mock();
    const view = render(MarkdownEditorSurface, {
      showPreview: false,
      label: "Description",
      hint: "Markdown supported",
      value: "Start",
      onChange,
    });

    expect(screen.getByText("Description")).toBeTruthy();
    expect(screen.getByText("Markdown supported")).toBeTruthy();

    const textarea = view.container.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "Updated text";
    await fireEvent.input(textarea);
    expect(onChange).toHaveBeenCalledWith("Updated text");
  });

  it("disables the editor while loading", () => {
    const view = render(MarkdownEditorHarness, {
      loading: true,
      showPreview: true
    });

    expect(view.container.querySelector("textarea")).toBeTruthy();
    expect((view.container.querySelector("textarea") as HTMLTextAreaElement).disabled).toBe(true);
  });
});
