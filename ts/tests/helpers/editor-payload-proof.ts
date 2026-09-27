import fixture from "../../../fixtures/wire/v1/nightfire-values.json";
import {
  asObject,
  fail,
  loadPublishedSchemas,
  payloadDocumentPath,
  validatePayload,
} from "../../scripts/schema-documents";

function representativePayload(type: string): Record<string, unknown> {
  const entry = fixture.values.find((value) => value.name === "core-payloads");
  const block = entry?.value.blocks.find((candidate) => candidate.type === type);
  const data = asObject(block?.data);
  if (!data) fail(`core-payloads is missing a ${type} representative`);
  return data;
}

function assertStoredKeysCovered(
  stored: unknown,
  representative: unknown,
  path: string,
  skipSubtrees: ReadonlySet<string>,
): void {
  if (skipSubtrees.has(path)) return;

  const storedObject = asObject(stored);
  const representativeObject = asObject(representative);
  if (storedObject) {
    if (!representativeObject) {
      fail(`${path}: editor stored an object; core-payloads representative does not`);
    }
    for (const key of Object.keys(storedObject)) {
      if (!(key in representativeObject)) {
        fail(`${path}: editor stored ${key}, absent from the core-payloads representative`);
      }
      assertStoredKeysCovered(
        storedObject[key],
        representativeObject[key],
        `${path}.${key}`,
        skipSubtrees,
      );
    }
    return;
  }

  if (Array.isArray(stored)) {
    if (!Array.isArray(representative) || representative.length === 0) {
      if (stored.length === 0) return;
      fail(`${path}: editor stored an array; core-payloads representative does not`);
    }
    stored.forEach((entry, index) => {
      const template = representative[Math.min(index, representative.length - 1)];
      assertStoredKeysCovered(entry, template, `${path}[${index}]`, skipSubtrees);
    });
  }
}

export async function proveEditorPayload(type: string, data: unknown): Promise<void> {
  const catalog = await loadPublishedSchemas();
  const errors = validatePayload(catalog, type, data);
  if (errors.length > 0) {
    fail(
      `${type} editor payload failed ${payloadDocumentPath(type)}:\n${errors.join("\n")}\n${JSON.stringify(data, null, 2)}`,
    );
  }

  const skipSubtrees = type === "rich_text" ? new Set([`${type}.document`]) : new Set<string>();
  assertStoredKeysCovered(data, representativePayload(type), type, skipSubtrees);
}
