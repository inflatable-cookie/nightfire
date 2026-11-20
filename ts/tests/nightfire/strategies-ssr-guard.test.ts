import { describe, expect, it } from "bun:test";
import { configureNightfireStrategies } from "../../src/strategies";
import { stubGlobalValue } from "../helpers/globals";

describe("nightfire/strategies SSR guard", () => {
  it("throws when configured during SSR (no window)", () => {
    expect(typeof window).toBe("undefined");
    expect(() =>
      configureNightfireStrategies({
        fetchStrategies: async () => []
      })
    ).toThrow(/SSR/);
  });

  it("succeeds in the browser", () => {
    const restoreWindow = stubGlobalValue("window", {});
    try {
      expect(() =>
        configureNightfireStrategies({
          fetchStrategies: async () => []
        })
      ).not.toThrow();
    } finally {
      restoreWindow();
    }
  });
});
