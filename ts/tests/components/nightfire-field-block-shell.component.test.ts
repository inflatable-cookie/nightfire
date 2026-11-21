import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, within } from "../render";

import "../../src/editor-registrations";
import NightfireFieldBlockShell from "../../src/editor/NightfireFieldBlockShell.svelte";
import { prepareNightfireForSave } from "../../src/validation";

afterEach(cleanup);

const baseShellProps = {
  schema: "example:content/description",
  definition: {
    schema: "example:content/description",
    mode: "single" as const,
    defaultType: "markdown"
  },
  editorTypeOptions: [
    { type: "markdown", label: "Markdown" },
    { type: "download_card", label: "Download card" }
  ],
  groupedOptions: null,
  slashState: null,
  filteredSlashCommands: [],
  onSingleTypeChange: mock(),
  onTypeChange: mock(),
  onSlashQueryChange: mock(),
  onSlashCommandSelect: mock(),
  onCloseSlashPalette: mock(),
  onAddFirstBlock: mock()
};

describe("nightfire/NightfireFieldBlockShell", () => {
  it("strips synthetic fallback ids in single mode so save assigns a real nf_ id", async () => {
    const onSingleBlockChange = mock();
    const view = render(NightfireFieldBlockShell, {
      ...baseShellProps,
      isMulti: false,
      singleBlock: null,
      blocks: [],
      onSingleBlockChange,
      onBlocksChange: mock()
    });

    const textarea = view.container.querySelector("textarea") as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: "Hello single block" } });

    expect(onSingleBlockChange).toHaveBeenCalled();
    const emitted = onSingleBlockChange.mock.calls.at(-1)![0] as { id?: string };
    expect(emitted.id).toBeUndefined();

    const prepared = prepareNightfireForSave({
      schema: "example:content/description",
      blocks: [emitted as any]
    });
    expect(prepared?.blocks[0]?.id).toMatch(/^nf_/);
    expect(prepared?.blocks[0]?.id).not.toContain("nightfire-unsaved-block");
  });

  it("strips synthetic fallback ids in multi mode when shell emits block changes", async () => {
    const onBlocksChange = mock();
    const view = render(NightfireFieldBlockShell, {
      ...baseShellProps,
      schema: "example:content/markup",
      isMulti: true,
      singleBlock: null,
      blocks: [
        { type: "markdown", version: "initial", data: { text: "First" } },
        { type: "markdown", version: "initial", data: { text: "Second" } }
      ],
      onSingleBlockChange: mock(),
      onBlocksChange
    });

    const removeButtons = within(view.container).getAllByRole("button", { name: "Remove block" });
    expect(removeButtons.length).toBeGreaterThan(0);
    await fireEvent.click(removeButtons[0]!);

    expect(onBlocksChange).toHaveBeenCalled();
    const emittedBlocks = onBlocksChange.mock.calls.at(-1)![0] as Array<{
      id?: string;
      data?: { text?: string };
    }>;
    expect(emittedBlocks.map((block) => block.data?.text)).toEqual(["Second"]);
    for (const block of emittedBlocks) {
      if (block.id !== undefined) {
        expect(block.id).not.toMatch(/^nightfire-unsaved-block-/);
      }
    }

    const prepared = prepareNightfireForSave({
      schema: "example:content/markup",
      blocks: emittedBlocks as any
    });
    expect(prepared?.blocks.length).toBeGreaterThan(0);
    for (const block of prepared?.blocks ?? []) {
      expect(block.id).toMatch(/^nf_/);
    }
  });
});
