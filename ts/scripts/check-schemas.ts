import { dirname, relative, resolve } from "node:path";
import fixture from "../../fixtures/wire/v1/nightfire-values.json";
import { CORE_BLOCK_TYPE_NAMES } from "../src/core-blocks";

type JsonObject = Record<string, unknown>;
type JsonSchema = boolean | JsonObject;

const repoRoot = resolve(import.meta.dir, "../..");
const schemaRoot = resolve(repoRoot, "schemas");
const documents = new Map<string, JsonObject>();
const rawDocuments = new Map<string, string>();
const glob = new Bun.Glob("**/*.schema.json");

for await (const entry of glob.scan({ cwd: schemaRoot, onlyFiles: true })) {
  const path = resolve(schemaRoot, entry);
  const raw = await Bun.file(path).text();
  rawDocuments.set(path, raw);
  documents.set(path, JSON.parse(raw) as JsonObject);
}

function fail(message: string): never {
  throw new Error(message);
}

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function schemaAt(path: string): JsonObject {
  return documents.get(resolve(schemaRoot, path)) ?? fail(`missing schema document: ${path}`);
}

function visit(value: unknown, callback: (object: JsonObject) => void): void {
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

function resolveReference(ref: string, fromPath: string): { schema: JsonSchema; path: string } {
  const [filePart, fragmentPart] = ref.split("#", 2);
  const path = filePart.length > 0 ? resolve(dirname(fromPath), filePart) : fromPath;
  if (!path.startsWith(`${schemaRoot}/`) && path !== schemaRoot) {
    fail(`schema reference escapes the published tree: ${ref}`);
  }
  const document = documents.get(path) ?? fail(`unresolved schema reference: ${ref}`);
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

function validate(value: unknown, schema: JsonSchema, schemaPath: string, instancePath = "$" ): string[] {
  if (schema === true) return [];
  if (schema === false) return [`${instancePath}: rejected by false schema`];

  if (typeof schema.$ref === "string") {
    const resolved = resolveReference(schema.$ref, schemaPath);
    return validate(value, resolved.schema, resolved.path, instancePath);
  }

  const errors: string[] = [];
  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  for (const child of allOf) {
    errors.push(...validate(value, child as JsonSchema, schemaPath, instancePath));
  }

  const anyOf = Array.isArray(schema.anyOf) ? schema.anyOf : [];
  if (anyOf.length > 0 && !anyOf.some((child) => validate(value, child as JsonSchema, schemaPath, instancePath).length === 0)) {
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
        errors.push(...validate(entry, schema.items as JsonSchema, schemaPath, `${instancePath}[${index}]`));
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
        errors.push(...validate(entry, properties[key] as JsonSchema, schemaPath, `${instancePath}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${instancePath}: unknown property ${key}`);
      } else if (asObject(schema.additionalProperties)) {
        errors.push(...validate(entry, schema.additionalProperties as JsonSchema, schemaPath, `${instancePath}.${key}`));
      }
    }
  }

  return errors;
}

function assertValid(value: unknown, path: string, label: string): void {
  const absolutePath = resolve(schemaRoot, path);
  const errors = validate(value, schemaAt(path), absolutePath);
  if (errors.length > 0) fail(`${label} failed ${path}:\n${errors.join("\n")}`);
}

function assertInvalid(value: unknown, path: string, label: string): void {
  const absolutePath = resolve(schemaRoot, path);
  if (validate(value, schemaAt(path), absolutePath).length === 0) {
    fail(`${label} unexpectedly passed ${path}`);
  }
}

const mechanicsIds = new Map([
  ["value.schema.json", "nightfire.value@1"],
  ["block.schema.json", "nightfire.block@1"],
  ["registry.schema.json", "nightfire.registry@1"],
  ["strategy.schema.json", "nightfire.strategy@1"],
]);

for (const [path, expectedId] of mechanicsIds) {
  const document = schemaAt(path);
  if (document.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    fail(`${path} is not declared as JSON Schema 2020-12`);
  }
  if (document.$id !== expectedId) fail(`${path} has unexpected $id ${String(document.$id)}`);
}

for (const [path, raw] of rawDocuments) {
  if (/acow:|silo\./i.test(raw)) fail(`${relative(repoRoot, path)} leaks consumer vocabulary`);
  const document = documents.get(path)!;
  if (document.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    fail(`${relative(repoRoot, path)} is not declared as JSON Schema 2020-12`);
  }
  visit(document, (object) => {
    if (typeof object.$ref !== "string") return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(object.$ref) || object.$ref.startsWith("/")) {
      fail(`${relative(repoRoot, path)} contains non-relative $ref ${object.$ref}`);
    }
    resolveReference(object.$ref, path);
  });
}

const publishedPayloads = [...documents.keys()]
  .filter((path) => dirname(path) === resolve(schemaRoot, "blocks"))
  .map((path) => relative(resolve(schemaRoot, "blocks"), path).replace(/\.schema\.json$/, ""))
  .sort();
const declaredCoreBlocks = [...CORE_BLOCK_TYPE_NAMES].sort();
if (JSON.stringify(publishedPayloads) !== JSON.stringify(declaredCoreBlocks)) {
  fail(`core payload schemas differ from CORE_BLOCK_TYPE_NAMES:\npublished=${publishedPayloads.join(",")}\ndeclared=${declaredCoreBlocks.join(",")}`);
}

assertValid({ blocks: fixture.registry.blocks }, "registry.schema.json", "shared registry");
assertValid(fixture.registry.strategy, "strategy.schema.json", "shared strategy");

for (const entry of fixture.values) {
  assertValid(entry.value, "value.schema.json", `shared positive value ${entry.name}`);
  for (const block of entry.value.blocks) {
    if (CORE_BLOCK_TYPE_NAMES.includes(block.type as never)) {
      assertValid(block.data, `blocks/${block.type}.schema.json`, `shared ${block.type} payload`);
    }
  }
}
assertInvalid(fixture.rejectedV1, "value.schema.json", "shared legacy envelope");

function isRecursiveDef(defName: string, defSchema: unknown): boolean {
  let recursive = false;
  visit(defSchema, (object) => {
    if (object.$ref === `#/$defs/${defName}`) recursive = true;
  });
  return recursive;
}

function assertCovers(
  schema: JsonSchema,
  value: unknown,
  schemaPath: string,
  document: JsonObject,
  instancePath: string,
): void {
  if (schema === true || schema === false) return;

  if (typeof schema.$ref === "string") {
    if (!schema.$ref.startsWith("#")) return;
    if (schema.$ref.startsWith("#/$defs/")) {
      const defName = schema.$ref.slice("#/$defs/".length);
      const defSchema = asObject(document.$defs)?.[defName];
      if (defSchema === undefined) fail(`${instancePath}: unresolved ${schema.$ref}`);
      if (isRecursiveDef(defName, defSchema)) return;
      assertCovers(defSchema as JsonSchema, value, schemaPath, document, instancePath);
      return;
    }
    const resolved = resolveReference(schema.$ref, schemaPath);
    const nextDocument = documents.get(resolved.path) ?? document;
    assertCovers(resolved.schema, value, resolved.path, nextDocument, instancePath);
    return;
  }

  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  for (const child of allOf) {
    assertCovers(child as JsonSchema, value, schemaPath, document, instancePath);
  }

  const properties = asObject(schema.properties);
  const object = asObject(value);
  if (properties) {
    if (!object) fail(`${instancePath}: representative is not an object`);
    for (const key of Object.keys(properties)) {
      if (!(key in object)) {
        fail(`${instancePath}: representative omits documented property ${key}`);
      }
      assertCovers(properties[key] as JsonSchema, object[key], schemaPath, document, `${instancePath}.${key}`);
    }
  }

  if (schema.items !== undefined && Array.isArray(value) && value.length > 0) {
    assertCovers(schema.items as JsonSchema, value[0], schemaPath, document, `${instancePath}[0]`);
  }
}

const corePayloadEntry = fixture.values.find((entry) => entry.name === "core-payloads");
if (!corePayloadEntry) fail("shared fixture is missing the core-payloads value");
const corePayloadBlocks = corePayloadEntry.value.blocks;
const corePayloadTypes = corePayloadBlocks.map((block) => block.type).sort();
if (JSON.stringify(corePayloadTypes) !== JSON.stringify(declaredCoreBlocks)) {
  fail(`core-payloads types differ from CORE_BLOCK_TYPE_NAMES:\npayloads=${corePayloadTypes.join(",")}\ndeclared=${declaredCoreBlocks.join(",")}`);
}

for (const block of corePayloadBlocks) {
  const path = `blocks/${block.type}.schema.json`;
  const document = schemaAt(path);
  assertValid(block.data, path, `core-payloads ${block.type}`);
  assertCovers(document, block.data, resolve(schemaRoot, path), document, `${block.type}`);
  const withLeak = { ...(block.data as JsonObject), unexpected: true };
  assertInvalid(withLeak, path, `${block.type} unknown-property counterexample`);
}

assertValid(
  { rows: [{ cells: [{ markdown: "" }] }] },
  "blocks/table.schema.json",
  "table row without section",
);

const descriptors = new Map(fixture.registry.blocks.map((block) => [block.type, block]));
const strategy = fixture.registry.strategy;
function fixtureCaseAccepted(value: (typeof fixture.validationCases)[number]["value"]): boolean {
  if (validate(value, schemaAt("value.schema.json"), resolve(schemaRoot, "value.schema.json")).length > 0) return false;
  if (value.blocks.length < strategy.cardinality.minBlocks) return false;
  if (strategy.cardinality.maxBlocks !== null && value.blocks.length > strategy.cardinality.maxBlocks) return false;
  return value.blocks.every((block) => {
    const descriptor = descriptors.get(block.type);
    if (!descriptor || !descriptor.supported.includes(block.version)) return false;
    if (!strategy.allowedTypes.includes(block.type) && !strategy.allowedCategories.includes(descriptor.category)) return false;
    if (CORE_BLOCK_TYPE_NAMES.includes(block.type as never)) {
      return validate(block.data, schemaAt(`blocks/${block.type}.schema.json`), resolve(schemaRoot, `blocks/${block.type}.schema.json`)).length === 0;
    }
    return true;
  });
}

for (const testCase of fixture.validationCases) {
  const accepted = fixtureCaseAccepted(testCase.value);
  if (accepted !== testCase.accepted) {
    fail(`shared validation case ${testCase.name} expected accepted=${testCase.accepted}, got ${accepted}`);
  }
}

const positiveCount = fixture.values.length + fixture.validationCases.filter((testCase) => testCase.accepted).length;
const negativeCount = 1 + fixture.validationCases.filter((testCase) => !testCase.accepted).length + declaredCoreBlocks.length;
console.log(`schema proof passed: ${documents.size} documents, ${declaredCoreBlocks.length} core payloads, ${positiveCount} positive cases, ${negativeCount} negative cases`);
