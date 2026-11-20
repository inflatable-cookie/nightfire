// Spec 071 pattern: publish-time identity verification.
//
// Publish mode never rebuilds. It downloads the candidate archive set and
// verifies, before any npm mutation, that the manifest binds the source commit,
// the version, the exact package set from `release-manifest.json`, and the
// SHA-256 of every tarball -- and that the archive set carries nothing else.

import { existsSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import {
  type CandidateManifest,
  parseTarballManifest,
  readCandidateManifest,
  readNpmPublicationAuthority,
  sha256File,
} from "./npm-publication";

export function verifyNpmCandidate(args: {
  root: string;
  manifestPath: string;
  archiveDir: string;
  tagVersion?: string;
  sourceCommit?: string;
}): CandidateManifest {
  const manifest = readCandidateManifest(args.manifestPath);
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

// A flag without a value is a broken invocation, not an absent flag: silently
// dropping it would skip the tag or commit check the workflow asked for.
export function cliValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.length === 0 || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
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
