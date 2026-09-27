import { dirname, resolve } from "node:path";

export type JsonObject = Record<string, unknown>;
export type JsonSchema = boolean | JsonObject;

export type SchemaCatalog = {
  repoRoot: string;
  schemaRoot: string;
  documents: Map<string, JsonObject>;
  rawDocuments: Map<string, string>;
};

const repoRoot = resolve(import.meta.dir, "../..");
const schemaRoot = resolve(repoRoot, "schemas");

let cached: SchemaCatalog | undefined;

export function fail(message: string): never {
  throw new Error(message);
}

export function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

export async function loadPublishedSchemas(): Promise<SchemaCatalog> {
  if (cached) return cached;

  const documents = new Map<string, JsonObject>();
  const rawDocuments = new Map<string, string>();
  const glob = new Bun.Glob("**/*.schema.json");

  for await (const entry of glob.scan({ cwd: schemaRoot, onlyFiles: true })) {
    const path = resolve(schemaRoot, entry);
    const raw = await Bun.file(path).text();
    rawDocuments.set(path, raw);
    documents.set(path, JSON.parse(raw) as JsonObject);
  }

  cached = { repoRoot, schemaRoot, documents, rawDocuments };
  return cached;
}

export function schemaAt(catalog: SchemaCatalog, path: string): JsonObject {
  return catalog.documents.get(resolve(catalog.schemaRoot, path))
    ?? fail(`missing schema document: ${path}`);
}

export function visit(value: unknown, callback: (object: JsonObject) => void): void {
  if (Array.isArray(value)) {
    for (const entry of value) visit(entry, callback);
    return;
  }
  const object = asObject(value);
  if (!object) return;
  callback(object);
  for (const entry of Object.values(object)) visit(entry, callback);
}

function resolvePointer(document: unknown, fragment: string): unknown {
  if (fragment === "" || fragment === "#") return document;
  if (!fragment.startsWith("#/")) fail(`unsupported schema fragment: ${fragment}`);
  let current = document;
  for (const part of fragment.slice(2).split("/")) {
    const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
    const object = asObject(current);
    if (!object || !(key in object)) fail(`unresolved schema fragment: ${fragment}`);
    current = object[key];
  }
  return current;
}

export function resolveReference(
  catalog: SchemaCatalog,
  ref: string,
  fromPath: string,
): { schema: JsonSchema; path: string } {
  const [filePart, fragmentPart] = ref.split("#", 2);
  const path = filePart.length > 0 ? resolve(dirname(fromPath), filePart) : fromPath;
  if (!path.startsWith(`${catalog.schemaRoot}/`) && path !== catalog.schemaRoot) {
    fail(`schema reference escapes the published tree: ${ref}`);
  }
  const document = catalog.documents.get(path) ?? fail(`unresolved schema reference: ${ref}`);
  const schema = resolvePointer(document, fragmentPart === undefined ? "" : `#${fragmentPart}`);
  if (typeof schema !== "boolean" && !asObject(schema)) {
    fail(`schema reference does not resolve to a schema: ${ref}`);
  }
  return { schema: schema as JsonSchema, path };
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "array": return Array.isArray(value);
    case "boolean": return typeof value === "boolean";
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "null": return value === null;
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "object": return asObject(value) !== null;
    case "string": return typeof value === "string";
    default: fail(`unsupported schema type: ${type}`);
  }
}

export function validate(
  catalog: SchemaCatalog,
  value: unknown,
  schema: JsonSchema,
  schemaPath: string,
  instancePath = "$",
): string[] {
  if (schema === true) return [];
  if (schema === false) return [`${instancePath}: rejected by false schema`];

  if (typeof schema.$ref === "string") {
    const resolved = resolveReference(catalog, schema.$ref, schemaPath);
    return validate(catalog, value, resolved.schema, resolved.path, instancePath);
  }

  const errors: string[] = [];
  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  for (const child of allOf) {
    errors.push(...validate(catalog, value, child as JsonSchema, schemaPath, instancePath));
  }

  const anyOf = Array.isArray(schema.anyOf) ? schema.anyOf : [];
  if (
    anyOf.length > 0
    && !anyOf.some((child) =>
      validate(catalog, value, child as JsonSchema, schemaPath, instancePath).length === 0
    )
  ) {
    errors.push(`${instancePath}: does not match any allowed shape`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => JSON.stringify(entry) === JSON.stringify(value))) {
    errors.push(`${instancePath}: value is not in enum`);
  }
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) {
    errors.push(`${instancePath}: value does not match const`);
  }

  if (typeof schema.type === "string" && !matchesType(value, schema.type)) {
    errors.push(`${instancePath}: expected ${schema.type}`);
    return errors;
  }

  if (typeof value === "string" && typeof schema.minLength === "number" && value.length < schema.minLength) {
    errors.push(`${instancePath}: shorter than minLength ${schema.minLength}`);
  }
  if (typeof value === "number" && typeof schema.minimum === "number" && value < schema.minimum) {
    errors.push(`${instancePath}: smaller than minimum ${schema.minimum}`);
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`${instancePath}: shorter than minItems ${schema.minItems}`);
    }
    if (schema.uniqueItems === true) {
      const keys = value.map((entry) => JSON.stringify(entry));
      if (new Set(keys).size !== keys.length) errors.push(`${instancePath}: items are not unique`);
    }
    if (schema.items !== undefined) {
      value.forEach((entry, index) => {
        errors.push(
          ...validate(
            catalog,
            entry,
            schema.items as JsonSchema,
            schemaPath,
            `${instancePath}[${index}]`,
          ),
        );
      });
    }
  }

  const object = asObject(value);
  if (object) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (typeof key === "string" && !(key in object)) errors.push(`${instancePath}: missing ${key}`);
    }
    const properties = asObject(schema.properties) ?? {};
    for (const [key, entry] of Object.entries(object)) {
      if (key in properties) {
        errors.push(
          ...validate(catalog, entry, properties[key] as JsonSchema, schemaPath, `${instancePath}.${key}`),
        );
      } else if (schema.additionalProperties === false) {
        errors.push(`${instancePath}: unknown property ${key}`);
      } else if (asObject(schema.additionalProperties)) {
        errors.push(
          ...validate(
            catalog,
            entry,
            schema.additionalProperties as JsonSchema,
            schemaPath,
            `${instancePath}.${key}`,
          ),
        );
      }
    }
  }

  return errors;
}

export function validateDocument(
  catalog: SchemaCatalog,
  value: unknown,
  relativePath: string,
): string[] {
  const absolutePath = resolve(catalog.schemaRoot, relativePath);
  return validate(catalog, value, schemaAt(catalog, relativePath), absolutePath);
}

export function payloadDocumentPath(type: string): string {
  return `blocks/${type}.schema.json`;
}

export function validatePayload(
  catalog: SchemaCatalog,
  type: string,
  data: unknown,
): string[] {
  return validateDocument(catalog, data, payloadDocumentPath(type));
}
