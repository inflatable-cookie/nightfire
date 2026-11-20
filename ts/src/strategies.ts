/**
 * Nightfire Strategies Management
 *
 * Provides lazy-loading and caching of Nightfire strategies.
 * Configure once at app level, then NightfireEditor components
 * automatically fetch and use strategies as needed.
 */

import { getContext, setContext } from "svelte";
import { writable, get, derived } from "svelte/store";

export interface NightfireStrategyCardinality {
  mode: "single" | "multi";
  minBlocks?: number;
  maxBlocks?: number | null;
}

export interface NightfireBlockOption {
  type: string;
  label: string;
  category?: string;
  subcategory?: string;
}

export interface NightfireStrategy {
  id: string;
  cardinality: NightfireStrategyCardinality;
  allowedTypes: Array<string>;
  allowedCategories: Array<string>;
  defaultType: string;
  blockOptions?: Array<NightfireBlockOption>;
}

export interface NightfireStrategiesConfig {
  /**
   * Function to fetch strategies from the API.
   * Should return the list of strategies.
   */
  fetchStrategies: () => Promise<Array<NightfireStrategy>>;
  /**
   * Cache TTL in milliseconds. Defaults to 1 hour.
   */
  cacheTtl?: number;
}

export interface NightfireStrategiesStore {
  strategies: typeof strategiesStore;
  loading: typeof loadingStore;
  error: typeof errorStore;
  ensure: () => Promise<Array<NightfireStrategy>>;
  refresh: () => Promise<Array<NightfireStrategy>>;
  invalidate: () => void;
  findById: (id: string) => NightfireStrategy | null;
}

const CONTEXT_KEY = Symbol("nightfire-strategies");
const DEFAULT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Module-level stores (singleton)
const strategiesStore = writable<Array<NightfireStrategy>>([]);
const loadingStore = writable(false);
const errorStore = writable<string | null>(null);
const byIdStore = derived(strategiesStore, ($strategies) => {
  const index = new Map<string, NightfireStrategy>();
  for (const strategy of $strategies) {
    index.set(strategy.id, strategy);
  }
  return index;
});

let fetchedAt: number | null = null;
let hasLoaded = false;
let fetchPromise: Promise<Array<NightfireStrategy>> | null = null;
let config: NightfireStrategiesConfig | null = null;
// The in-flight request that currently owns the store. A response from any
// other token is a superseded request and must not write cache or error state.
let activeRequest: object | null = null;

/**
 * Configure Nightfire strategies loading.
 * Call this once at app startup (e.g., in root layout).
 *
 * @example
 * ```ts
 * configureNightfireStrategies({
 *   fetchStrategies: async () => {
 *     const token = auth.getToken();
 *     if (!token) return [];
 *     return nightfireCommands.listStrategies(fetch, token, { includeOptions: true });
 *   }
 * });
 * ```
 */
export function configureNightfireStrategies(cfg: NightfireStrategiesConfig): void {
  // Guard against SSR misuse. `cfg.fetchStrategies` typically closes over the
  // signed-in user's token (see the example above); this is process-global
  // module state shared across concurrent SSR requests, so setting it during
  // SSR can leak one user's fetch/token into another's request. Call only in
  // the browser. (The static `registerSchema`/`registerBlockEditor` registry
  // in editor-registry.ts is app-static and safe to run at module load.)
  if (typeof window === "undefined") {
    throw new Error(
      "configureNightfireStrategies() was called during SSR. Its " +
        "fetchStrategies closure usually captures per-user auth, and this is " +
        "process-global state shared across concurrent server requests. Call " +
        "it only in the browser (onMount or a `typeof window !== 'undefined'` " +
        "guard)."
    );
  }
  config = cfg;
  // A new fetch source must not inherit the previous one's cache.
  resetCache();
}

function isStale(): boolean {
  if (fetchedAt === null) {
    return true;
  }
  const ttl = config?.cacheTtl ?? DEFAULT_CACHE_TTL;
  // A non-positive TTL means "never cache": `cacheTtl: 0` is a real request to
  // refetch every time, not a value that needs to be spelled `-1`.
  return ttl <= 0 || Date.now() - fetchedAt >= ttl;
}

function resetCache(): void {
  fetchedAt = null;
  hasLoaded = false;
  fetchPromise = null;
  activeRequest = null;
  loadingStore.set(false);
  // A retired cache is not a cache of the old config's strategies, and its error
  // belongs to the request that failed, not to the one about to start.
  strategiesStore.set([]);
  errorStore.set(null);
}

/**
 * Ensure strategies are loaded. Returns cached data if available and fresh,
 * otherwise fetches from the API. Multiple concurrent calls share the same
 * fetch promise.
 */
async function ensure(): Promise<Array<NightfireStrategy>> {
  // A cached empty list is a real answer: it stays cached until it goes stale.
  if (hasLoaded && !isStale()) {
    return get(strategiesStore);
  }

  // If already fetching, return the existing promise
  if (fetchPromise) {
    return fetchPromise;
  }

  // Check if configured
  if (!config) {
    errorStore.set(
      "Nightfire strategies not configured. Call configureNightfireStrategies() first."
    );
    return [];
  }

  const request = {};
  activeRequest = request;
  loadingStore.set(true);
  errorStore.set(null);

  const settle = (): boolean => {
    if (activeRequest !== request) {
      return false;
    }
    fetchPromise = null;
    loadingStore.set(false);
    activeRequest = null;
    return true;
  };

  fetchPromise = config
    .fetchStrategies()
    .then((result) => {
      // A slower earlier request must not clobber a later one.
      if (activeRequest !== request) {
        return get(strategiesStore);
      }
      strategiesStore.set(result);
      fetchedAt = Date.now();
      hasLoaded = true;
      settle();
      return result;
    })
    .catch((error) => {
      if (!settle()) {
        return get(strategiesStore);
      }
      errorStore.set(error instanceof Error ? error.message : "Failed to load strategies");
      // The answer is whatever the store holds, so a caller that read
      // `strategies` and a caller that awaited `ensure()` never disagree: a
      // failed refetch keeps the stale list rather than pretending it is empty.
      return get(strategiesStore);
    });

  return fetchPromise;
}

/**
 * Force a refresh of strategies, ignoring the cache.
 */
async function refresh(): Promise<Array<NightfireStrategy>> {
  resetCache();
  return ensure();
}

/**
 * Invalidate the cache without fetching. Next call to ensure() will fetch.
 */
function invalidate(): void {
  resetCache();
}

/**
 * Find a strategy by ID. Returns null if not found or not loaded.
 */
function findById(id: string): NightfireStrategy | null {
  return get(byIdStore).get(id) ?? null;
}

/**
 * Create the Nightfire strategies store.
 * Used internally by createNightfireStrategiesContext.
 */
function createStore(): NightfireStrategiesStore {
  return {
    strategies: strategiesStore,
    loading: loadingStore,
    error: errorStore,
    ensure,
    refresh,
    invalidate,
    findById
  };
}

/**
 * Set up the Nightfire strategies context.
 * Call this in your root layout component.
 */
export function createNightfireStrategiesContext(): NightfireStrategiesStore {
  const store = createStore();
  setContext(CONTEXT_KEY, store);
  return store;
}

/**
 * Get the Nightfire strategies store from context.
 * Returns null if not in a component context or not configured.
 */
export function useNightfireStrategies(): NightfireStrategiesStore | null {
  try {
    return getContext<NightfireStrategiesStore>(CONTEXT_KEY) ?? null;
  } catch {
    // Not in component context
    return null;
  }
}

/**
 * Get a strategy by ID, ensuring strategies are loaded first.
 * Convenience function for use in components.
 */
export async function getStrategy(id: string): Promise<NightfireStrategy | null> {
  await ensure();
  return findById(id);
}
