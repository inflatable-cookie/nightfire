import { describe, expect, it } from "../vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CANDIDATE_SCHEMA,
  parseCandidateManifest,
  sha256File,
} from "../../scripts/npm-publication";
import { cliValue } from "../../scripts/verify-npm-candidate";

// The archive step writes the candidate identity manifest and the publish step
// reads it. Both go through these helpers, so a malformed or hand-edited
// manifest is refused by name instead of failing later on a missing property.

const REPO_ROOT = join(import.meta.dir, "../../..");

function manifest(packages: unknown[] = []): string {
  return JSON.stringify({
    schema: CANDIDATE_SCHEMA,
    sourceCommit: "b2b13e9d1f365fbf1d83f25c9eb6fefbd541e48a",
    version: "0.6.0",
    packages,
  });
}

const PACKAGE = {
  name: "@inflatable-cookie/nightfire",
  path: ".",
  tarball: "inflatable-cookie-nightfire-0.6.0.tgz",
  version: "0.6.0",
  sha256: "0".repeat(64),
};

describe("tooling/npm-publication", () => {
  it("hashes a file with node:crypto, not a shasum subprocess", () => {
    const scratch = mkdtempSync(join(tmpdir(), "nightfire-npm-sha-"));
    try {
      const path = join(scratch, "probe.txt");
      writeFileSync(path, "nightfire\n");
      expect(sha256File(path)).toBe(
        "0b712120cf05083e1f1df3fa5f1d1411df8253d5159fe7cb4d77ef362be9e0e8",
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("reads a well-formed candidate manifest", () => {
    expect(parseCandidateManifest(manifest([PACKAGE]), "candidate.json")).toEqual({
      schema: CANDIDATE_SCHEMA,
      sourceCommit: "b2b13e9d1f365fbf1d83f25c9eb6fefbd541e48a",
      version: "0.6.0",
      packages: [PACKAGE],
    });
  });

  it("refuses a manifest that is not the candidate identity document", () => {
    expect(() => parseCandidateManifest("{", "candidate.json")).toThrow(/is not valid JSON/);
    expect(() =>
      parseCandidateManifest(JSON.stringify({ schema: "other", packages: [PACKAGE] }), "candidate.json")
    ).toThrow(/declares schema other/);
    expect(() => parseCandidateManifest(manifest(), "candidate.json")).toThrow(
      /must list at least one package/
    );
  });

  it("refuses a package entry with a missing or mistyped field", () => {
    expect(() => parseCandidateManifest(manifest(["tarball"]), "candidate.json")).toThrow(
      /package 0 must be an object/
    );
    const { sha256: _dropped, ...incomplete } = PACKAGE;
    expect(() => parseCandidateManifest(manifest([incomplete]), "candidate.json")).toThrow(
      /package 0 must declare a non-empty string sha256/
    );
  });

  it("refuses a flag without a value instead of skipping the check", () => {
    expect(cliValue(["--root", "."], "--tag-version")).toBeUndefined();
    expect(cliValue(["--tag-version", "0.6.0"], "--tag-version")).toBe("0.6.0");
    expect(() => cliValue(["--tag-version"], "--tag-version")).toThrow(
      /--tag-version requires a value/
    );
    expect(() => cliValue(["--tag-version", ""], "--tag-version")).toThrow(
      /--tag-version requires a value/
    );
    expect(() => cliValue(["--tag-version", "--dir", "x"], "--tag-version")).toThrow(
      /--tag-version requires a value/
    );
  });

  it("fails the verify CLI when the tag-version flag carries no value", () => {
    const result = Bun.spawnSync(
      [
        process.execPath,
        join(REPO_ROOT, "ts/scripts/verify-npm-candidate.ts"),
        "--tag-version",
      ],
      { cwd: REPO_ROOT, stdout: "pipe", stderr: "pipe" },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("--tag-version requires a value");
  });
});
