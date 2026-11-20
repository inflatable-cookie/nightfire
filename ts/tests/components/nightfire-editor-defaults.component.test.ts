import { describe, expect, it } from "bun:test";
import { flushSync, tick } from "svelte";
import { render, screen, waitFor } from "../render";

import NightfireEditorHarness from "../fixtures/NightfireEditorHarness.svelte";

describe("nightfire/NightfireEditor defaults", () => {
  it("prefers schema default type over the first block option in the type picker", async () => {
    const view = render(NightfireEditorHarness, {
      schema: "example:content/description",
      initialValue: {
        schema: "example:content/description",
      },
      modeOverride: "single",
      defaultTypeOverride: "markdown",
      blockOptions: [
        { type: "content.list", label: "Content List" },
        { type: "markdown", label: "Markdown" },
      ],
    });

    const typeSelect = await screen.findByLabelText("Block type");
    expect((typeSelect as HTMLSelectElement).value).toBe("markdown");
    expect(view.getByTestId("nightfire-value").textContent).toContain("\"schema\": \"example:content/description\"");
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
            data: { alt: "Draft alt" },
          },
        ],
      },
    });

    flushSync();
    await tick();

    const payload = JSON.parse(view.getByTestId("nightfire-value").textContent ?? "{}");
    expect(payload.blocks).toEqual([
      {
        id: "nf_draft_image",
        type: "image",
        version: "initial",
        data: { alt: "Draft alt" },
      },
    ]);
    expect(view.container.textContent).toContain("This field is required.");
  });

  it("initialises a default block when required is true and blocks is empty", async () => {
    const view = render(NightfireEditorHarness, {
      schema: "example:content/markup",
      modeOverride: "multi",
      required: true,
      initialValue: {
        schema: "example:content/markup",
        blocks: [],
      },
    });

    await waitFor(() => {
      const payload = JSON.parse(view.getByTestId("nightfire-value").textContent ?? "{}");
      expect(payload.blocks).toHaveLength(1);
      expect(payload.blocks[0].type).toBe("markdown");
      expect(payload.blocks[0].id).toMatch(/^nf_/);
    });
  });
});
