let idCounter = 0;

export function createStableId(prefix: string): string {
  // Deterministic across SSR + hydration, as long as component construction order matches.
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
