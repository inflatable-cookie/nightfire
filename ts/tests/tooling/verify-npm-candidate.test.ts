import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CANDIDATE_SCHEMA,
  sha256File,
} from "../../scripts/npm-publication";
import { assertKnownFlags, verifyNpmCandidate } from "../../scripts/verify-npm-candidate";

// Publish mode verifies the archive set before any npm mutation. Each case builds
// a real tarball in its own fixture directory, under the run's temporary root, and
// removes only that directory.

const REPO_ROOT = join(import.meta.dir, "../../..");
const NAME = "@inflatable-cookie/nightfire";
const VERSION = "0.6.0";
const COMMIT = "b2b13e9d1f365fbf1d83f25c9eb6fefbd541e48a";
const TARBALL = "inflatable-cookie-nightfire-0.6.0.tgz";

function withFixture(run: (root: string, archive: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "nightfire-verify-candidate-"));
  try {
    const archive = join(root, "archive");
    mkdirSync(archive);
    writeFileSync(
      join(root, "release-manifest.json"),
      JSON.stringify({
        npmPublication: {
          candidateManifestName: "candidate.json",
          packages: [{ name: NAME, path: "." }],
        },
      }),
    );
    run(root, archive);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function packTarball(root: string, archive: string): string {
  const staging = join(root, "staging");
  mkdirSync(join(staging, "package"), { recursive: true });
  writeFileSync(join(staging, "package", "package.json"), JSON.stringify({ name: NAME, version: VERSION }));
  const tarball = join(archive, TARBALL);
  const packed = Bun.spawnSync(["tar", "-czf", tarball, "-C", staging, "package"]);
  if (packed.exitCode !== 0) throw new Error(`tar failed: ${packed.stderr.toString()}`);
  return tarball;
}

function writeCandidate(archive: string, overrides: Record<string, unknown> = {}): string {
  const path = join(archive, "candidate.json");
  const sha256 = sha256File(join(archive, TARBALL));
  writeFileSync(
    path,
    JSON.stringify({
      schema: CANDIDATE_SCHEMA,
      sourceCommit: COMMIT,
      version: VERSION,
      packages: [{ name: NAME, path: ".", tarball: TARBALL, version: VERSION, sha256 }],
      ...overrides,
    }),
  );
  return path;
}

function verify(root: string, archive: string, manifestPath: string, tagVersion = VERSION) {
  return verifyNpmCandidate({
    root,
    manifestPath,
    archiveDir: archive,
    tagVersion,
    sourceCommit: COMMIT,
  });
}

describe("tooling/verify-npm-candidate", () => {
  it("accepts an archive set that matches its manifest, tag and commit", () => {
    withFixture((root, archive) => {
      packTarball(root, archive);
      const manifest = writeCandidate(archive);
      expect(verify(root, archive, manifest).version).toBe(VERSION);
    });
  });

  it("refuses a tag that does not match the candidate version", () => {
    withFixture((root, archive) => {
      packTarball(root, archive);
      const manifest = writeCandidate(archive);
      expect(() => verify(root, archive, manifest, "0.6.1")).toThrow(
        /candidate version 0.6.0 does not match tag 0.6.1/,
      );
    });
  });

  it("refuses a tarball whose hash differs from the manifest", () => {
    withFixture((root, archive) => {
      packTarball(root, archive);
      const manifest = writeCandidate(archive, {
        packages: [{ name: NAME, path: ".", tarball: TARBALL, version: VERSION, sha256: "0".repeat(64) }],
      });
      expect(() => verify(root, archive, manifest)).toThrow(
        /hash [0-9a-f]{64} does not match manifest 0{64}/,
      );
    });
  });

  it("refuses a stray .tgz that the manifest does not name", () => {
    withFixture((root, archive) => {
      packTarball(root, archive);
      const manifest = writeCandidate(archive);
      writeFileSync(join(archive, "stray.tgz"), "not a candidate");
      expect(() => verify(root, archive, manifest)).toThrow(
        /candidate archive set carries unexpected tarballs: stray.tgz/,
      );
    });
  });

  it("refuses an unknown or repeated CLI flag instead of ignoring it", () => {
    expect(() => assertKnownFlags(["--tag-verison", "0.6.0"])).toThrow(
      /unknown argument --tag-verison/,
    );
    expect(() => assertKnownFlags(["--tag-version", "0.6.0", "stray"])).toThrow(
      /unknown argument stray/,
    );
    expect(() =>
      assertKnownFlags(["--tag-version", "0.6.0", "--tag-version", "0.6.1"]),
    ).toThrow(/--tag-version is given more than once/);
    expect(() => assertKnownFlags(["--tag-version", "0.6.0", "--source-commit", COMMIT])).not.toThrow();
  });

  it("fails the verify CLI on a misspelled flag before it reads anything", () => {
    const result = Bun.spawnSync(
      [
        process.execPath,
        join(REPO_ROOT, "ts/scripts/verify-npm-candidate.ts"),
        "--tag-verison",
        VERSION,
      ],
      { cwd: REPO_ROOT, stdout: "pipe", stderr: "pipe" },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("unknown argument --tag-verison");
  });
});
