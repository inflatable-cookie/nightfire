import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkReleaseAutomation } from "../../scripts/check-release-automation";

// The release-automation guard is static text analysis: no dispatch, no
// registry, no network. Each case either reads the repository's own workflow
// or builds a fixture workflow in its own temporary directory and removes only
// that directory.

const REPO_ROOT = join(import.meta.dir, "../../..");

function withWorkflow(workflow: string | null, run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "nightfire-release-automation-"));
  try {
    writeFileSync(
      join(root, "release-manifest.json"),
      JSON.stringify({
        npmPublication: {
          candidateManifestName: "candidate.json",
          packages: [{ name: "@inflatable-cookie/nightfire", path: "." }]
        }
      })
    );
    if (workflow !== null) {
      const dir = join(root, ".github", "workflows");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "release.yml"), workflow);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("tooling/check-release-automation", () => {
  it("accepts the repository's own release workflow", () => {
    expect(checkReleaseAutomation(REPO_ROOT)).toEqual([]);
  });

  it("reports a missing release workflow instead of passing silently", () => {
    withWorkflow(null, (root) => {
      expect(checkReleaseAutomation(root)).toEqual([".github/workflows/release.yml is missing"]);
    });
  });

  it("reports a workflow that lost its candidate/publish structure", () => {
    withWorkflow(
      [
        "name: Release",
        "",
        "on:",
        "  push:",
        "",
        "permissions:",
        "  contents: read",
        "",
        "jobs:",
        "  release:",
        "    runs-on: ubuntu-latest",
        "    timeout-minutes: 10",
        "    steps:",
        "      - run: npm publish .",
        ""
      ].join("\n"),
      (root) => {
        const errors = checkReleaseAutomation(root);
        expect(errors).toContain("release workflow must be dispatch-driven");
        expect(errors).toContain("release workflow must offer candidate and publish modes");
        expect(errors).toContain("release workflow must not run on push or pull_request");
        expect(errors).toContain("publish mode must never publish a package directory");
      }
    );
  });
});
