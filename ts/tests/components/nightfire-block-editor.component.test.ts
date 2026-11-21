import { afterEach, describe, expect, it } from "bun:test";
import { flushSync } from "svelte";
import { cleanup, fireEvent, render, within } from "../render";

import "../../src/editor-registrations";
import type { BlockTypeOption, SchemaDefinition } from "../../src/editor-registry";
import NightfireBlockEditorHarness from "./NightfireBlockEditorHarness.svelte";

const definition: SchemaDefinition = {
  schema: "example:content/markup",
  mode: "multi",
  defaultType: "markdown"
};
const typeOptions: Array<BlockTypeOption> = [{ type: "table", label: "Table" }];

function tableBlock(id: string) {
  return {
    id,
    type: "table",
    version: "initial",
    data: {
      rows: [
        { cells: [{ markdown: "A" }, { markdown: "B" }] },
        { cells: [{ markdown: "C" }, { markdown: "D" }] }
      ]
    }
  };
}

afterEach(cleanup);

describe("nightfire/NightfireBlockEditor", () => {
  it("remounts the block editor when the block identity changes", async () => {
    const view = render(NightfireBlockEditorHarness, {
      initialBlock: tableBlock("nf_first"),
      definition,
      typeOptions
    });

    const cell = within(view.container).getByRole("gridcell", { name: "Row 1, column 1" });
    await fireEvent.focus(cell);
    await fireEvent.click(within(view.container).getByRole("button", { name: "Remove row" }));
    expect(within(view.container).getByRole("alertdialog")).toBeTruthy();

    (view.component as { setBlock: (next: unknown) => void }).setBlock(tableBlock("nf_second"));
    flushSync();

    // A sibling block of the same type mounts fresh: the pending confirmation
    // belonged to the block that is no longer here.
    expect(within(view.container).queryByRole("alertdialog")).toBeNull();
  });

  it("keeps the editor mounted when an id-less block mints its first id", async () => {
    const view = render(NightfireBlockEditorHarness, {
      initialBlock: { ...tableBlock(""), id: undefined },
      definition,
      typeOptions
    });

    const grid = within(view.container).getByRole("grid");
    (view.component as { setBlock: (next: unknown) => void }).setBlock(tableBlock("nf_minted"));
    flushSync();

    // The block is the same one: the id appeared, nothing else changed, so the
    // table editor keeps its DOM and its in-progress state.
    expect(within(view.container).getByRole("grid")).toBe(grid);
  });
});
