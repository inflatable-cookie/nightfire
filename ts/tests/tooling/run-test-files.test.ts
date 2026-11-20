import { describe, expect, it } from "../vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A selector that names nothing is a broken suite. The runner must fail loudly
// rather than report success for tests that never ran.

const RUNNER = join(import.meta.dir, "../../scripts/run-test-files.ts");

function run(...roots: string[]) {
  return Bun.spawnSync([process.execPath, RUNNER, ...roots], {
    stdout: "pipe",
    stderr: "pipe",
  });
}

function scratchFixture(): string {
  return mkdtempSync(join(tmpdir(), "nightfire-run-test-files-"));
}

describe("tooling/run-test-files", () => {
  it("refuses a path that does not exist", () => {
    const scratch = scratchFixture();
    try {
      const missing = join(scratch, "absent");
      const result = run(missing);
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain(`missing test path: ${missing}`);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("refuses a directory holding no test file", () => {
    const scratch = scratchFixture();
    try {
      const empty = join(scratch, "empty");
      mkdirSync(empty);
      writeFileSync(join(empty, "helper.ts"), "export const helper = 1;\n");
      const result = run(empty);
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain(`no *.test.ts files under ${empty}`);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("runs a directory that holds a test file", () => {
    const scratch = scratchFixture();
    try {
      const suite = join(scratch, "suite");
      mkdirSync(suite);
      writeFileSync(
        join(suite, "passes.test.ts"),
        'import { expect, it } from "bun:test";\nit("passes", () => { expect(1).toBe(1); });\n',
      );
      const result = run(suite);
      expect(result.exitCode).toBe(0);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
