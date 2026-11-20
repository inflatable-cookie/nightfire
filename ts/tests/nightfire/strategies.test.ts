import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { get } from "svelte/store";
import type {
  configureNightfireStrategies,
  createNightfireStrategiesContext,
  getStrategy,
  useNightfireStrategies
} from "../../src/strategies";
import { stubGlobalValue } from "../helpers/globals";

const contextMap = new Map<symbol, unknown>();
const mockSetContext = mock((key: symbol, value: unknown) => {
  contextMap.set(key, value);
  return value;
});
const mockGetContext = mock((key: symbol) => {
  if (!contextMap.has(key)) {
    throw new Error("no context");
  }
  return contextMap.get(key);
});

void mock.module("svelte", () => ({
  setContext: mockSetContext,
  getContext: mockGetContext
}));

// Each load carries a fresh query key, so Bun evaluates a new module instance
// per case and no strategy state carries from one test into the next.
type StrategiesModule = {
  configureNightfireStrategies: typeof configureNightfireStrategies;
  createNightfireStrategiesContext: typeof createNightfireStrategiesContext;
  getStrategy: typeof getStrategy;
  useNightfireStrategies: typeof useNightfireStrategies;
};

let importCase = 0;
function loadStrategies(): Promise<StrategiesModule> {
  importCase += 1;
  return import(`../../src/strategies.ts?case=${importCase}`);
}

const noop = () => {};
let restoreWindow: (() => void) | undefined;

describe("nightfire/strategies", () => {
  beforeEach(() => {
    contextMap.clear();
    mockSetContext.mockClear();
    mockGetContext.mockClear();
    // configureNightfireStrategies is browser-only (throws under SSR); these
    // tests exercise the configured path, so simulate the browser.
    restoreWindow = stubGlobalValue("window", {});
  });

  afterEach(() => {
    restoreWindow?.();
    restoreWindow = undefined;
  });

  it("handles unconfigured store and context usage", async () => {
    const strategies = await loadStrategies();
    const store = strategies.createNightfireStrategiesContext();

    expect(await store.ensure()).toEqual([]);
    expect(get(store.error)).toContain("not configured");
    expect(strategies.useNightfireStrategies()).toBe(store);
  });

  it("loads, caches, refreshes and invalidates strategies", async () => {
    const strategies = await loadStrategies();
    let calls = 0;
    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        calls += 1;
        return [
          {
            id: `s-${calls}`,
            cardinality: { mode: "single" },
            allowedTypes: [],
            allowedCategories: [],
            defaultType: "markdown"
          }
        ];
      },
      cacheTtl: 100_000
    });

    const store = strategies.createNightfireStrategiesContext();
    const [a, b] = await Promise.all([store.ensure(), store.ensure()]);
    expect(calls).toBe(1);
    expect(a).toEqual(b);
    expect(store.findById("s-1")?.id).toBe("s-1");
    expect(await strategies.getStrategy("s-1")).toEqual(expect.objectContaining({ id: "s-1" }));

    await store.refresh();
    expect(calls).toBe(2);
    expect(store.findById("s-2")?.id).toBe("s-2");

    store.invalidate();
    await store.ensure();
    expect(calls).toBe(3);
  });

  it("caches an empty strategy list until it is invalidated", async () => {
    const strategies = await loadStrategies();
    let calls = 0;
    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        calls += 1;
        return [];
      },
      cacheTtl: 100_000
    });

    const store = strategies.createNightfireStrategiesContext();
    expect(await store.ensure()).toEqual([]);
    expect(await store.ensure()).toEqual([]);
    expect(calls).toBe(1);

    store.invalidate();
    await store.ensure();
    expect(calls).toBe(2);
  });

  it("does not let a slower earlier fetch clobber a refresh", async () => {
    const strategies = await loadStrategies();
    let calls = 0;
    let releaseSlow = noop;
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });

    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        calls += 1;
        if (calls === 1) {
          await slowGate;
          return [
            {
              id: "slow",
              cardinality: { mode: "single" },
              allowedTypes: [],
              allowedCategories: [],
              defaultType: "markdown"
            }
          ];
        }
        return [
          {
            id: "fast",
            cardinality: { mode: "single" },
            allowedTypes: [],
            allowedCategories: [],
            defaultType: "markdown"
          }
        ];
      },
      cacheTtl: 100_000
    });

    const store = strategies.createNightfireStrategiesContext();
    const slow = store.ensure();
    const fast = store.refresh();
    expect(await fast).toEqual([expect.objectContaining({ id: "fast" })]);

    releaseSlow();
    expect(await slow).toEqual([expect.objectContaining({ id: "fast" })]);

    expect(store.findById("fast")?.id).toBe("fast");
    expect(store.findById("slow")).toBeNull();
  });

  it("clears loading when an in-flight fetch is invalidated", async () => {
    const strategies = await loadStrategies();
    let releaseSlow = noop;
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });

    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        await slowGate;
        return [
          {
            id: "stale",
            cardinality: { mode: "single" },
            allowedTypes: [],
            allowedCategories: [],
            defaultType: "markdown"
          }
        ];
      },
      cacheTtl: 100_000
    });

    const store = strategies.createNightfireStrategiesContext();
    const pending = store.ensure();
    expect(get(store.loading)).toBe(true);

    store.invalidate();
    expect(get(store.loading)).toBe(false);

    releaseSlow();
    expect(await pending).toEqual([]);
    expect(get(store.loading)).toBe(false);
    expect(store.findById("stale")).toBeNull();
  });

  it("returns null when strategy context is missing", async () => {
    const strategies = await loadStrategies();
    expect(strategies.useNightfireStrategies()).toBeNull();
  });

  it("refuses to configure under SSR", async () => {
    const strategies = await loadStrategies();
    restoreWindow?.();
    restoreWindow = undefined;
    expect(typeof window).toBe("undefined");

    expect(() =>
      strategies.configureNightfireStrategies({ fetchStrategies: async () => [] })
    ).toThrow(/SSR/);
  });

  it("treats cacheTtl 0 as never cached", async () => {
    const strategies = await loadStrategies();
    let calls = 0;
    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        calls += 1;
        return [
          {
            id: `z-${calls}`,
            cardinality: { mode: "single" },
            allowedTypes: [],
            allowedCategories: [],
            defaultType: "markdown"
          }
        ];
      },
      cacheTtl: 0
    });

    const store = strategies.createNightfireStrategiesContext();
    expect((await store.ensure())[0]?.id).toBe("z-1");
    expect((await store.ensure())[0]?.id).toBe("z-2");
    expect(calls).toBe(2);
  });

  it("clears the previous strategies and error when reconfigured", async () => {
    const strategies = await loadStrategies();
    strategies.configureNightfireStrategies({
      fetchStrategies: async () => [
        {
          id: "old",
          cardinality: { mode: "single" },
          allowedTypes: [],
          allowedCategories: [],
          defaultType: "markdown"
        }
      ],
      cacheTtl: 100_000
    });

    const store = strategies.createNightfireStrategiesContext();
    expect((await store.ensure())[0]?.id).toBe("old");

    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        throw new Error("new config failed");
      },
      cacheTtl: 100_000
    });

    // The new config must not inherit the previous list or its error state.
    expect(get(store.strategies)).toEqual([]);
    expect(get(store.error)).toBeNull();
    expect(store.findById("old")).toBeNull();

    expect(await store.ensure()).toEqual([]);
    expect(get(store.error)).toBe("new config failed");
  });

  it("keeps ensure() and the strategy store consistent when a stale refetch fails", async () => {
    const strategies = await loadStrategies();
    let calls = 0;
    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        calls += 1;
        if (calls === 2) {
          throw new Error("refetch failed");
        }
        return [
          {
            id: "kept",
            cardinality: { mode: "single" },
            allowedTypes: [],
            allowedCategories: [],
            defaultType: "markdown"
          }
        ];
      },
      cacheTtl: 0
    });

    const store = strategies.createNightfireStrategiesContext();
    expect((await store.ensure())[0]?.id).toBe("kept");

    const afterFailure = await store.ensure();
    expect(get(store.error)).toBe("refetch failed");
    expect(afterFailure).toEqual(get(store.strategies));
    expect(afterFailure[0]?.id).toBe("kept");
  });

  it("returns null when context lookup succeeds but value is undefined", async () => {
    const strategies = await loadStrategies();
    mockGetContext.mockImplementationOnce(() => undefined);
    expect(strategies.useNightfireStrategies()).toBeNull();
  });

  it("handles strategy fetch failures and stale cache re-fetch", async () => {
    const strategies = await loadStrategies();
    let calls = 0;
    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        calls += 1;
        if (calls === 1) {
          throw "boom";
        }
        return [
          {
            id: `ok-${calls}`,
            cardinality: { mode: "single" },
            allowedTypes: [],
            allowedCategories: [],
            defaultType: "markdown"
          }
        ];
      },
      cacheTtl: -1
    });

    const store = strategies.createNightfireStrategiesContext();
    expect(await store.ensure()).toEqual([]);
    expect(get(store.error)).toBe("Failed to load strategies");

    const loaded = await store.ensure();
    expect(loaded[0]?.id).toBe("ok-2");
    expect(get(store.error)).toBeNull();

    await store.ensure();
    expect(calls).toBe(3);
  });

  it("uses default cache ttl and preserves Error messages", async () => {
    const strategies = await loadStrategies();
    let calls = 0;
    strategies.configureNightfireStrategies({
      fetchStrategies: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("explicit boom");
        }
        return [
          {
            id: "s-default-ttl",
            cardinality: { mode: "single" },
            allowedTypes: [],
            allowedCategories: [],
            defaultType: "markdown"
          }
        ];
      }
    });

    const store = strategies.createNightfireStrategiesContext();
    expect(await store.ensure()).toEqual([]);
    expect(get(store.error)).toBe("explicit boom");

    expect(await store.ensure()).toEqual([
      {
        id: "s-default-ttl",
        cardinality: { mode: "single" },
        allowedTypes: [],
        allowedCategories: [],
        defaultType: "markdown"
      }
    ]);
    expect(calls).toBe(2);

    // Cached result should be reused under default TTL.
    await store.ensure();
    expect(calls).toBe(2);
    expect(store.findById("missing-id")).toBeNull();
  });
});
