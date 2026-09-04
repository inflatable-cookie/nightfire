import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  test,
} from "bun:test";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

function resolveMockSpecifier(specifier: string): string {
  if (!specifier.startsWith(".")) return specifier;
  const caller = new Error().stack
    ?.split("\n")
    .map((line) => line.match(/\((\/[^:]+):\d+:\d+\)/)?.[1])
    .find((path) => path && path !== import.meta.path);
  if (!caller) return specifier;
  const candidate = resolve(dirname(caller), specifier);
  for (const suffix of ["", ".ts", ".svelte", "/index.ts"]) {
    if (existsSync(candidate + suffix)) return candidate + suffix;
  }
  return candidate;
}

export const vi = {
  fn: mock,
  hoisted<T>(factory: () => T): T {
    return factory();
  },
  mock(specifier: string, factory: () => unknown): void {
    mock.module(resolveMockSpecifier(specifier), factory);
  },
  doMock(specifier: string, factory: () => unknown): void {
    mock.module(resolveMockSpecifier(specifier), factory);
  },
  resetModules(): void {
    // Bun updates mocked module bindings in place. Tests reset their own state.
  },
  clearAllMocks(): void {
    mock.clearAllMocks();
  },
  stubGlobal(name: string, value: unknown): void {
    if (!originalGlobals.has(name)) {
      originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    }
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  },
  unstubAllGlobals(): void {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, name);
      }
    }
    originalGlobals.clear();
  },
};

export { afterEach, beforeEach, describe, expect, it, test };
