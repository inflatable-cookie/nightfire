import { KeyedRegistry } from "./registry-map";

export interface BlockVersionSpec {
  readonly current: string;
  readonly supported: ReadonlyArray<string>;
}

const DEFAULT_VERSIONS: BlockVersionSpec = Object.freeze({
  current: "initial",
  supported: Object.freeze(["initial"])
});

const blockVersions = new KeyedRegistry<BlockVersionSpec>();

function areSupportedVersions(value: unknown): value is ReadonlyArray<string> {
  return (
    Array.isArray(value) &&
    value.every(
      (version: unknown): version is string =>
        typeof version === "string" && version.trim().length > 0
    )
  );
}

/**
 * Register the versions one block type accepts.
 *
 * The set is validated and frozen here, mirroring `BlockVersions::new` in the
 * Rust crate: an empty `supported` list, or one that omits `current`, is a bug
 * in the registration rather than a version policy, so it throws. A later
 * mutation of the caller's array must not reach the registry.
 */
export function registerBlockVersions(type: string, spec: BlockVersionSpec): void {
  if (typeof type !== "string" || type.trim().length === 0) {
    throw new TypeError("block type must be a non-empty string");
  }

  const current = spec?.current;
  const supportedValue: unknown = spec?.supported;

  if (typeof current !== "string" || current.trim().length === 0) {
    throw new TypeError(`block type ${type} needs a non-empty current version`);
  }

  if (!Array.isArray(supportedValue) || supportedValue.length === 0) {
    throw new TypeError(`block type ${type} must list at least one supported version`);
  }

  if (!areSupportedVersions(supportedValue)) {
    throw new TypeError(`block type ${type} has an empty or non-string supported version`);
  }

  const supported = supportedValue;

  if (!supported.includes(current)) {
    throw new TypeError(
      `block type ${type} current version ${current} is not in the supported versions`
    );
  }

  blockVersions.set(type, Object.freeze({ current, supported: Object.freeze(supported.slice()) }));
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
export function resolveBlockVersion(type: string, version: string): string | null {
  const spec = getBlockVersions(type);
  return spec.supported.includes(version) ? spec.current : null;
}
