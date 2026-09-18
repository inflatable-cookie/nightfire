import { mkdtemp, rm } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";

const destination = await mkdtemp(join(tmpdir(), "nightfire-pack-"));
try {
  const packed = Bun.spawnSync([
    "bun", "pm", "pack", "--ignore-scripts", "--quiet", "--destination", destination,
  ]);
  if (packed.exitCode !== 0) throw new Error(packed.stderr.toString());
  const filename = packed.stdout.toString().trim().split("\n").at(-1)!;
  const tarball = isAbsolute(filename) ? filename : join(destination, filename);
  const listed = Bun.spawnSync(["tar", "-tzf", tarball]);
  if (listed.exitCode !== 0) throw new Error(listed.stderr.toString());
  const entries = listed.stdout.toString().trim().split("\n");
  for (const required of [
    "package/package.json",
    "package/README.md",
    "package/LICENSE",
    "package/PROVENANCE.md",
    "package/ts/src/core.ts",
    "package/ts/src/NightfireRenderer.svelte",
    "package/fixtures/wire/v1/nightfire-values.json",
    "package/schemas/value.schema.json",
    "package/schemas/block.schema.json",
    "package/schemas/registry.schema.json",
    "package/schemas/strategy.schema.json",
    "package/schemas/blocks/markdown.schema.json",
    "package/schemas/blocks/rich_text.schema.json",
    "package/schemas/blocks/download_card.schema.json",
    "package/schemas/blocks/table.schema.json",
    "package/schemas/blocks/item_list.schema.json",
    "package/schemas/blocks/image.schema.json",
  ]) {
    if (!entries.includes(required)) throw new Error(`packed artifact missing ${required}`);
  }
  for (const forbidden of ["package/ts/tests/", "package/ts/scripts/", "package/docs/", "package/effigy.toml"]) {
    if (entries.some((entry) => entry.startsWith(forbidden))) {
      throw new Error(`packed artifact leaked ${forbidden}`);
    }
  }
  console.log(`pack proof passed: ${entries.length} files, ${Bun.file(tarball).size} bytes`);
} finally {
  await rm(destination, { recursive: true, force: true });
}
