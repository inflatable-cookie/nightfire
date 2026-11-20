// Shared registry mechanics.
//
// Nightfire registries are process-global maps. Every one of them exposes
// `unregister` and `clear` so a test or a hot reload can retire a registration
// instead of leaking it into the next case or request.
//
// Schema-scoped registries resolve `schema` before the `*` wildcard: an entry
// registered for a schema always beats the same type registered for everything.

export const WILDCARD_SCHEMA = "*";

function schemaScope(schema: string | null | undefined): string {
  const scope = schema?.trim();
  return scope && scope.length > 0 ? scope : WILDCARD_SCHEMA;
}

/** A registry keyed by one string. */
export class KeyedRegistry<T> {
  readonly #entries = new Map<string, T>();

  get(key: string): T | null {
    return this.#entries.get(key) ?? null;
  }

  set(key: string, value: T): void {
    this.#entries.set(key, value);
  }

  delete(key: string): boolean {
    return this.#entries.delete(key);
  }

  clear(): void {
    this.#entries.clear();
  }

  get size(): number {
    return this.#entries.size;
  }
}

/** A registry keyed by schema and block type, where a schema entry beats `*`. */
export class SchemaScopedRegistry<T> {
  readonly #scopes = new Map<string, Map<string, T>>();

  set(schema: string | null | undefined, type: string, value: T): void {
    const scope = schemaScope(schema);
    const entries = this.#scopes.get(scope);
    if (entries) {
      entries.set(type, value);
      return;
    }

    this.#scopes.set(scope, new Map([[type, value]]));
  }

  get(schema: string | null | undefined, type: string): T | null {
    const scope = schemaScope(schema);
    const scoped = this.#scopes.get(scope)?.get(type);
    if (scoped !== undefined) {
      return scoped;
    }

    if (scope === WILDCARD_SCHEMA) {
      return null;
    }

    return this.#scopes.get(WILDCARD_SCHEMA)?.get(type) ?? null;
  }

  delete(schema: string | null | undefined, type: string): boolean {
    const scope = schemaScope(schema);
    const entries = this.#scopes.get(scope);
    if (!entries) {
      return false;
    }

    const deleted = entries.delete(type);
    if (entries.size === 0) {
      this.#scopes.delete(scope);
    }
    return deleted;
  }

  clear(): void {
    this.#scopes.clear();
  }

  get size(): number {
    let total = 0;
    for (const entries of this.#scopes.values()) {
      total += entries.size;
    }
    return total;
  }

  /**
   * The entries answered for `schema`, in registration order: the schema's own
   * entries first, then the wildcard entries it does not override.
   */
  entriesForSchema(schema: string | null | undefined): Array<{ type: string; value: T }> {
    const scope = schemaScope(schema);
    const scoped = this.#scopes.get(scope);
    const entries: Array<{ type: string; value: T }> = [];
    for (const [type, value] of scoped ?? []) {
      entries.push({ type, value });
    }

    if (scope === WILDCARD_SCHEMA) {
      return entries;
    }

    for (const [type, value] of this.#scopes.get(WILDCARD_SCHEMA) ?? []) {
      if (!scoped?.has(type)) {
        entries.push({ type, value });
      }
    }
    return entries;
  }
}
