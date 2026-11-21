import { describe, expect, it, mock } from "bun:test";
import { flushSync, tick } from "svelte";
import { render, screen, waitFor } from "../render";

import NightfireEditorHarness from "../fixtures/NightfireEditorHarness.svelte";

describe("nightfire/NightfireEditor defaults", () => {
  it("prefers schema default type over the first block option in the type picker", async () => {
    const view = render(NightfireEditorHarness, {
      schema: "example:content/description",
      initialValue: {
        schema: "example:content/description"
      },
      modeOverride: "single",
      defaultTypeOverride: "markdown",
      blockOptions: [
        { type: "content.list", label: "Content List" },
        { type: "markdown", label: "Markdown" }
      ]
    });

    const typeSelect = await screen.findByLabelText("Block type");
    expect((typeSelect as HTMLSelectElement).value).toBe("markdown");
    expect(view.getByTestId("nightfire-value").textContent).toContain(
      '"schema": "example:content/description"'
    );
  });

  it("preserves an existing content-empty draft block when required is true", async () => {
    const view = render(NightfireEditorHarness, {
      schema: "example:content/markup",
      modeOverride: "multi",
      required: true,
      initialValue: {
        schema: "example:content/markup",
        blocks: [
          {
            id: "nf_draft_image",
            type: "image",
            version: "initial",
            data: { alt: "Draft alt" }
          }
        ]
      }
    });

    flushSync();
    await tick();

    const payload = JSON.parse(view.getByTestId("nightfire-value").textContent ?? "{}");
    expect(payload.blocks).toEqual([
      {
        id: "nf_draft_image",
        type: "image",
        version: "initial",
        data: { alt: "Draft alt" }
      }
    ]);
    expect(view.container.textContent).toContain("This field is required.");
  });

  it("initialises a default block when required is true and blocks is empty", async () => {
    const onChange = mock();
    const view = render(NightfireEditorHarness, {
      schema: "example:content/markup",
      modeOverride: "multi",
      required: true,
      onChange,
      initialValue: {
        schema: "example:content/markup",
        blocks: []
      }
    });

    await waitFor(() => {
      const payload = JSON.parse(view.getByTestId("nightfire-value").textContent ?? "{}");
      expect(payload.blocks).toHaveLength(1);
      expect(payload.blocks[0].type).toBe("markdown");
      expect(payload.blocks[0].id).toMatch(/^nf_/);
    });

    // A controlled caller without bind:value learns about the initialised
    // value through onChange, not just through the internal state.
    const emitted = onChange.mock.calls.at(-1)![0];
    expect(emitted.blocks).toHaveLength(1);
    expect(emitted.blocks[0].type).toBe("markdown");
  });

  it("reports the same schema mismatch again after it clears", async () => {
    const onSchemaMismatch = mock();
    const view = render(NightfireEditorHarness, {
      schema: "example:content/markup",
      modeOverride: "single",
      onSchemaMismatch,
      initialValue: {
        schema: "example:content/other",
        blocks: [{ type: "markdown", version: "initial", data: { text: "" } }]
      }
    });
    const setValue = (view.component as { setValue: (next: unknown) => void }).setValue;

    await waitFor(() => expect(onSchemaMismatch).toHaveBeenCalledTimes(1));
    expect(onSchemaMismatch.mock.calls[0]![0]).toMatchObject({
      actualSchema: "example:content/other",
      expectedSchema: "example:content/markup"
    });

    setValue({
      schema: "example:content/markup",
      blocks: [{ type: "markdown", version: "initial", data: { text: "" } }]
    });
    flushSync();
    await tick();

    setValue({
      schema: "example:content/other",
      blocks: [{ type: "markdown", version: "initial", data: { text: "" } }]
    });
    flushSync();
    await tick();

    await waitFor(() => expect(onSchemaMismatch).toHaveBeenCalledTimes(2));
  });
});
