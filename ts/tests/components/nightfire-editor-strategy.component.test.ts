import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, waitFor, within } from "../render";

import NightfireEditorStrategyHarness from "../fixtures/NightfireEditorStrategyHarness.svelte";
import { configureNightfireStrategies, type NightfireStrategy } from "../../src/strategies";

const strategies: NightfireStrategy[] = [
  {
    id: "strategy.multi",
    cardinality: { mode: "multi" },
    allowedTypes: ["markdown"],
    allowedCategories: [],
    defaultType: "markdown",
  },
  {
    id: "strategy.single",
    cardinality: { mode: "single" },
    allowedTypes: ["markdown"],
    allowedCategories: [],
    defaultType: "markdown",
  },
];

configureNightfireStrategies({ fetchStrategies: async () => strategies });

afterEach(cleanup);

describe("nightfire/NightfireEditor strategy loading", () => {
  it("reloads the strategy when the schema prop changes", async () => {
    const view = render(NightfireEditorStrategyHarness, {
      initialSchema: "strategy.multi",
      nextSchema: "strategy.single",
    });

    // The multi strategy shows an add control for an empty value.
    await waitFor(() =>
      expect(within(view.container).getByRole("button", { name: "+ Add block" })).toBeTruthy(),
    );

    await fireEvent.click(within(view.container).getByRole("button", { name: "Switch schema" }));

    // The single strategy edits one markdown block directly.
    await waitFor(() => {
      expect(within(view.container).queryByRole("button", { name: "+ Add block" })).toBeNull();
      expect(view.container.querySelector("textarea")).not.toBeNull();
    });
  });
});
