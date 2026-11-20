import type { Component } from "svelte";
import { SchemaScopedRegistry } from "./registry-map";

export type BlockRendererComponent = Component<any>;

const registry = new SchemaScopedRegistry<BlockRendererComponent>();

export function registerBlockRenderer(
  schema: string | null,
  type: string,
  component: BlockRendererComponent
): void {
  registry.set(schema, type, component);
}

export function unregisterBlockRenderer(schema: string | null, type: string): boolean {
  return registry.delete(schema, type);
}

export function clearBlockRenderers(): void {
  registry.clear();
}

export function getBlockRenderer(
  schema: string | null | undefined,
  type: string | undefined
): BlockRendererComponent | null {
  if (!type) {
    return null;
  }

  return registry.get(schema ?? null, type);
}

// Registrations are defined in `*-registrations.ts` to keep this file
// focused purely on registry mechanics.
