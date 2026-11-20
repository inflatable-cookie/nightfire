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

/**
 * Register the versions one block type accepts.
 *
 * The set is validated and frozen here, mirroring `BlockVersions::new` in the
 * Rust crate: an empty `supported` list, or one that omits `current`, is a bug
 * in the registration rather than a version policy, so it throws. A later
 * mutation of the caller's array must not reach the registry.
 */
export function registerBlockVersions(
  type: string,
  spec: BlockVersionSpec
): void {
  const current = spec?.current;
  const supported = spec?.supported;

  if (typeof current !== "string" || current.trim().length === 0) {
    throw new TypeError(`block type ${type} needs a non-empty current version`);
  }

  if (!Array.isArray(supported) || supported.length === 0) {
    throw new TypeError(
      `block type ${type} must list at least one supported version`
    );
  }

  if (!supported.every((version) => typeof version === "string")) {
    throw new TypeError(`block type ${type} has a non-string supported version`);
  }

  if (!supported.includes(current)) {
    throw new TypeError(
      `block type ${type} current version ${current} is not in the supported versions`
    );
  }

  blockVersions.set(
    type,
    Object.freeze({ current, supported: Object.freeze([...supported]) })
  );
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
