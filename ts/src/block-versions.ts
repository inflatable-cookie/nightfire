import { KeyedRegistry } from "./registry-map";

export interface BlockVersionSpec {
  readonly current: string;
  readonly supported: readonly string[];
}

const DEFAULT_VERSIONS: BlockVersionSpec = Object.freeze({
  current: "initial",
  supported: Object.freeze(["initial"])
});

const blockVersions = new KeyedRegistry<BlockVersionSpec>();

export function registerBlockVersions(
  type: string,
  spec: BlockVersionSpec
): void {
  blockVersions.set(type, spec);
}

export function unregisterBlockVersions(type: string): boolean {
  return blockVersions.delete(type);
}

export function clearBlockVersions(): void {
  blockVersions.clear();
}

export function getBlockVersions(type: string): BlockVersionSpec {
  return blockVersions.get(type) ?? DEFAULT_VERSIONS;
}

/**
 * Resolve a stored block version to the current implementation.
 * Unknown versions fail closed (`null`).
 */
export function resolveBlockVersion(
  type: string,
  version: string
): string | null {
  const spec = getBlockVersions(type);
  return spec.supported.includes(version) ? spec.current : null;
}
