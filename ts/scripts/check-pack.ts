import { mkdtemp, rm } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";

import { CORE_BLOCK_TYPE_NAMES } from "../src/core-blocks";

const destination = await mkdtemp(join(tmpdir(), "nightfire-pack-"));
try {
  const packed = Bun.spawnSync([
    "bun",
    "pm",
    "pack",
    "--ignore-scripts",
    "--quiet",
    "--destination",
    destination
  ]);
  if (packed.exitCode !== 0) {
    throw new Error(packed.stderr.toString());
  }
  const filename = packed.stdout.toString().trim().split("\n").at(-1) ?? "";
  const tarball = isAbsolute(filename) ? filename : join(destination, filename);
  const listed = Bun.spawnSync(["tar", "-tzf", tarball]);
  if (listed.exitCode !== 0) {
    throw new Error(listed.stderr.toString());
  }
  const entries = listed.stdout.toString().trim().split("\n");
  for (const required of [
    "package/package.json",
    "package/README.md",
    "package/LICENSE",
    "package/PROVENANCE.md",
    "package/ts/src/core.ts",
    "package/ts/src/NightfireRenderer.svelte",
    "package/ts/src/rich-text.ts",
    "package/fixtures/wire/v1/nightfire-values.json",
    "package/schemas/value.schema.json",
    "package/schemas/block.schema.json",
    "package/schemas/registry.schema.json",
    "package/schemas/strategy.schema.json",
    // One payload schema per declared core block, so a new core block that ships
    // without its schema is caught here rather than at a consumer's migration.
    ...CORE_BLOCK_TYPE_NAMES.map((type) => `package/schemas/blocks/${type}.schema.json`)
  ]) {
    if (!entries.includes(required)) {
      throw new Error(`packed artifact missing ${required}`);
    }
  }
  for (const forbidden of [
    "package/ts/tests/",
    "package/ts/scripts/",
    "package/docs/",
    "package/effigy.toml"
  ]) {
    if (entries.some((entry) => entry.startsWith(forbidden))) {
      throw new Error(`packed artifact leaked ${forbidden}`);
    }
  }
  console.log(`pack proof passed: ${entries.length} files, ${Bun.file(tarball).size} bytes`);
} finally {
  await rm(destination, { recursive: true, force: true });
}
