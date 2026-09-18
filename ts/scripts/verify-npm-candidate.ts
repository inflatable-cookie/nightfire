// Spec 071 pattern: publish-time identity verification.
//
// Publish mode never rebuilds. It downloads the candidate archive set and
// verifies, before any npm mutation, that the manifest binds the source commit,
// the version, the exact package set from `release-manifest.json`, and the
// SHA-256 of every tarball -- and that the archive set carries nothing else.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { readNpmPublicationAuthority } from "./npm-publication";

export const CANDIDATE_SCHEMA = "nightfire.npm-candidate.v1";

export type CandidateManifest = {
  schema: string;
  sourceCommit: string;
  version: string;
  packages: { name: string; path: string; tarball: string; version: string; sha256: string }[];
};

export function sha256File(path: string): string {
  return execFileSync("shasum", ["-a", "256", path], { encoding: "utf8" }).trim().split(/\s+/)[0];
}

function parseTarballManifest(tarballPath: string): { name: string; version: string } {
  let raw: string;
  try {
    raw = execFileSync("tar", ["-xzOf", tarballPath, "package/package.json"], { encoding: "utf8" });
  } catch {
    throw new Error(`candidate tarball ${basename(tarballPath)} has no package/package.json`);
  }
  const manifest = JSON.parse(raw) as Record<string, unknown>;
  if (typeof manifest.name !== "string" || typeof manifest.version !== "string") {
    throw new Error(`candidate tarball ${basename(tarballPath)} has no name/version`);
  }
  return { name: manifest.name, version: manifest.version };
}

export function verifyNpmCandidate(args: {
  root: string;
  manifestPath: string;
  archiveDir: string;
  tagVersion?: string;
  sourceCommit?: string;
}): CandidateManifest {
  if (!existsSync(args.manifestPath)) {
    throw new Error(`candidate identity manifest not found: ${args.manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(args.manifestPath, "utf8")) as CandidateManifest;
  if (manifest.schema !== CANDIDATE_SCHEMA) {
    throw new Error(`unexpected candidate identity schema: ${manifest.schema}`);
  }
  if (args.tagVersion !== undefined && manifest.version !== args.tagVersion) {
    throw new Error(`candidate version ${manifest.version} does not match tag ${args.tagVersion}`);
  }
  if (args.sourceCommit !== undefined && manifest.sourceCommit !== args.sourceCommit) {
    throw new Error(
      `candidate source commit ${manifest.sourceCommit} does not match the tag commit ${args.sourceCommit}`,
    );
  }
  const authority = readNpmPublicationAuthority(args.root);
  const expected = new Map(authority.packages.map((entry) => [entry.name, entry.path]));
  if (manifest.packages.length !== authority.packages.length) {
    throw new Error(
      `candidate publishes ${manifest.packages.length} packages; release authority declares ${authority.packages.length}`,
    );
  }
  const seen = new Set<string>();
  for (const entry of manifest.packages) {
    if (seen.has(entry.name)) throw new Error(`candidate manifest repeats ${entry.name}`);
    seen.add(entry.name);
    const expectedPath = expected.get(entry.name);
    if (expectedPath === undefined) {
      throw new Error(`candidate publishes ${entry.name}, which is not in the release authority`);
    }
    if (entry.path !== expectedPath) {
      throw new Error(`candidate declares ${entry.name} at ${entry.path}, expected ${expectedPath}`);
    }
    if (entry.version !== manifest.version) {
      throw new Error(`candidate ${entry.name} is ${entry.version}, expected lockstep ${manifest.version}`);
    }
    const tarballPath = join(args.archiveDir, entry.tarball);
    if (basename(tarballPath) !== entry.tarball || !existsSync(tarballPath)) {
      throw new Error(`candidate tarball missing: ${entry.tarball}`);
    }
    const digest = sha256File(tarballPath);
    if (digest !== entry.sha256) {
      throw new Error(
        `candidate tarball ${entry.tarball} hash ${digest} does not match manifest ${entry.sha256}`,
      );
    }
    const packed = parseTarballManifest(tarballPath);
    if (packed.name !== entry.name || packed.version !== entry.version) {
      throw new Error(
        `candidate tarball ${entry.tarball} contains ${packed.name}@${packed.version}, expected ${entry.name}@${entry.version}`,
      );
    }
  }
  const stray = readdirSync(args.archiveDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tgz"))
    .map((entry) => entry.name)
    .filter((name) => !manifest.packages.some((entry) => entry.tarball === name));
  if (stray.length > 0) {
    throw new Error(`candidate archive set carries unexpected tarballs: ${stray.join(", ")}`);
  }
  return manifest;
}

function cliValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const root = resolve(cliValue(argv, "--root") ?? process.cwd());
  const archiveDir = resolve(cliValue(argv, "--dir") ?? join(root, "release-artifacts"));
  const manifestPath = resolve(
    cliValue(argv, "--manifest") ??
      join(archiveDir, readNpmPublicationAuthority(root).candidateManifestName),
  );
  const manifest = verifyNpmCandidate({
    root,
    manifestPath,
    archiveDir,
    tagVersion: cliValue(argv, "--tag-version"),
    sourceCommit: cliValue(argv, "--source-commit"),
  });
  for (const entry of manifest.packages) {
    process.stdout.write(`${entry.name}@${entry.version} ${entry.sha256} ${entry.tarball}\n`);
  }
}
