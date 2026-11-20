/**
 * A process-unique DOM id for one rendered element.
 *
 * Deliberately not a module counter. A counter is process-global mutable state:
 * it drifts across concurrent SSR requests in the same process, so two surfaces
 * can mint the same id, and its output depends on everything rendered before it.
 * A random id carries no request state.
 */
export function createStableId(prefix: string): string {
  return `${prefix}-${randomToken()}`;
}

function randomToken(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto?.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return Math.random().toString(36).slice(2, 12);
}
