import type { Component } from "svelte";
import { KeyedRegistry, SchemaScopedRegistry } from "./registry-map";

export type FieldMode = "single" | "multi";

export interface SchemaDefinition {
  schema: string;
  mode: FieldMode;
  defaultType: string;
}

export interface BlockTypeOption {
  type: string;
  label: string;
}

/**
 * Function that determines whether a block's content is meaningfully empty.
 * Returns `true` when the block has no user-entered content.
 */
export type BlockEmptyChecker = (block: any) => boolean;

export type BlockEditorComponent = Component<any, any, any>;

const schemaDefs = new KeyedRegistry<SchemaDefinition>();
const blockEditors = new SchemaScopedRegistry<BlockEditorComponent>();
const blockTypeOptions = new SchemaScopedRegistry<BlockTypeOption>();
const blockEmptyCheckers = new KeyedRegistry<BlockEmptyChecker>();

export function registerSchema(def: SchemaDefinition): void {
  schemaDefs.set(def.schema, def);
}

export function unregisterSchema(schema: string): boolean {
  return schemaDefs.delete(schema);
}

export function clearSchemas(): void {
  schemaDefs.clear();
}

/**
 * Register an editor and its palette label for `(schema, type)`. Registering
 * the same pair again replaces the component and updates the label.
 */
export function registerBlockEditor(
  schema: string | null,
  type: string,
  label: string,
  component: BlockEditorComponent
): void {
  blockEditors.set(schema, type, component);
  blockTypeOptions.set(schema, type, { type, label });
}

export function unregisterBlockEditor(schema: string | null, type: string): boolean {
  blockTypeOptions.delete(schema, type);
  return blockEditors.delete(schema, type);
}

export function clearBlockEditors(): void {
  blockEditors.clear();
  blockTypeOptions.clear();
}

export function getSchemaDefinition(schema: string): SchemaDefinition | null {
  return schemaDefs.get(schema);
}

export function getBlockEditor(
  schema: string | null | undefined,
  type: string
): BlockEditorComponent | null {
  return blockEditors.get(schema, type);
}

/**
 * The palette options for a schema. A schema's own entries come first and win
 * over a wildcard (`*`) entry for the same type.
 */
export function getBlockTypeOptionsForSchema(schema: string): Array<BlockTypeOption> {
  return blockTypeOptions.entriesForSchema(schema).map(({ value }) => value);
}

export function getBlockTypeLabel(schema: string, type: string): string | null {
  return blockTypeOptions.get(schema, type)?.label ?? null;
}

/**
 * Register a function that checks whether a block of the given type
 * is content-empty (i.e. has no meaningful user input).
 *
 * When no checker is registered for a block type the default behaviour
 * is to treat any present block as non-empty.
 */
export function registerBlockEmptyChecker(type: string, checker: BlockEmptyChecker): void {
  blockEmptyCheckers.set(type, checker);
}

export function unregisterBlockEmptyChecker(type: string): boolean {
  return blockEmptyCheckers.delete(type);
}

export function clearBlockEmptyCheckers(): void {
  blockEmptyCheckers.clear();
}

/**
 * Check whether a block is content-empty using the registered checker
 * for its type. Returns `true` if the block is empty, `false` if it
 * has meaningful content. When no checker is registered the block is
 * assumed to be non-empty (conservative default).
 */
export function isBlockContentEmpty(block: unknown): boolean {
  if (!block || typeof block !== "object") {
    return true;
  }
  const type = "type" in block ? block.type : undefined;
  if (!type) {
    return true;
  }
  if (typeof type !== "string") {
    return false;
  } // non-string type has no checker → assume non-empty
  const checker = blockEmptyCheckers.get(type);
  if (!checker) {
    return false;
  } // no checker → assume non-empty
  return checker(block);
}

// Registrations are defined in `*-registrations.ts` to keep this file
// focused purely on registry mechanics.
