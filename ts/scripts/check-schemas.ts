import { dirname, relative, resolve } from "node:path";
import fixture from "../../fixtures/wire/v1/nightfire-values.json";
import { CORE_BLOCK_TYPE_NAMES } from "../src/core-blocks";
import {
  asObject,
  fail,
  loadPublishedSchemas,
  resolveReference,
  schemaAt,
  type JsonObject,
  type JsonSchema,
  validateDocument,
  visit,
} from "./schema-documents";

const catalog = await loadPublishedSchemas();
const { repoRoot, schemaRoot, documents, rawDocuments } = catalog;

function assertValid(value: unknown, path: string, label: string): void {
  const errors = validateDocument(catalog, value, path);
  if (errors.length > 0) fail(`${label} failed ${path}:\n${errors.join("\n")}`);
}

function assertInvalid(value: unknown, path: string, label: string): void {
  if (validateDocument(catalog, value, path).length === 0) {
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
  const document = schemaAt(catalog, path);
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
    resolveReference(catalog, object.$ref, path);
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
    const resolved = resolveReference(catalog, schema.$ref, schemaPath);
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
  const document = schemaAt(catalog, path);
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
  if (validateDocument(catalog, value, "value.schema.json").length > 0) return false;
  if (value.blocks.length < strategy.cardinality.minBlocks) return false;
  if (strategy.cardinality.maxBlocks !== null && value.blocks.length > strategy.cardinality.maxBlocks) return false;
  return value.blocks.every((block) => {
    const descriptor = descriptors.get(block.type);
    if (!descriptor || !descriptor.supported.includes(block.version)) return false;
    if (!strategy.allowedTypes.includes(block.type) && !strategy.allowedCategories.includes(descriptor.category)) return false;
    if (CORE_BLOCK_TYPE_NAMES.includes(block.type as never)) {
      return validateDocument(catalog, block.data, `blocks/${block.type}.schema.json`).length === 0;
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
