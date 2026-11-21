// Spec 071 pattern: publish-time identity verification.
//
// Publish mode never rebuilds. It downloads the candidate archive set and
// verifies, before any npm mutation, that the manifest binds the source commit,
// the version, the exact package set from `release-manifest.json`, and the
// SHA-256 of every tarball -- and that the archive set carries nothing else.

import { existsSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import {
  parseTarballManifest,
  readCandidateManifest,
  readNpmPublicationAuthority,
  sha256File
} from "./npm-publication";
import type { CandidateManifest } from "./npm-publication";

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
      `candidate source commit ${manifest.sourceCommit} does not match the tag commit ${args.sourceCommit}`
    );
  }
  const authority = readNpmPublicationAuthority(args.root);
  const expected = new Map(authority.packages.map((entry) => [entry.name, entry.path]));
  if (manifest.packages.length !== authority.packages.length) {
    throw new Error(
      `candidate publishes ${manifest.packages.length} packages; release authority declares ${authority.packages.length}`
    );
  }
  const seen = new Set<string>();
  for (const entry of manifest.packages) {
    if (seen.has(entry.name)) {
      throw new Error(`candidate manifest repeats ${entry.name}`);
    }
    seen.add(entry.name);
    const expectedPath = expected.get(entry.name);
    if (expectedPath === undefined) {
      throw new Error(`candidate publishes ${entry.name}, which is not in the release authority`);
    }
    if (entry.path !== expectedPath) {
      throw new Error(
        `candidate declares ${entry.name} at ${entry.path}, expected ${expectedPath}`
      );
    }
    if (entry.version !== manifest.version) {
      throw new Error(
        `candidate ${entry.name} is ${entry.version}, expected lockstep ${manifest.version}`
      );
    }
    const tarballPath = join(args.archiveDir, entry.tarball);
    if (basename(tarballPath) !== entry.tarball || !existsSync(tarballPath)) {
      throw new Error(`candidate tarball missing: ${entry.tarball}`);
    }
    const digest = sha256File(tarballPath);
    if (digest !== entry.sha256) {
      throw new Error(
        `candidate tarball ${entry.tarball} hash ${digest} does not match manifest ${entry.sha256}`
      );
    }
    const packed = parseTarballManifest(tarballPath);
    if (packed.name !== entry.name || packed.version !== entry.version) {
      throw new Error(
        `candidate tarball ${entry.tarball} contains ${packed.name}@${packed.version}, expected ${entry.name}@${entry.version}`
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

export const VERIFY_FLAGS = [
  "--root",
  "--dir",
  "--manifest",
  "--tag-version",
  "--source-commit"
] as const;

// An unknown or repeated flag is a typo, not an option to ignore: `--tag-verison`
// silently dropped would skip the tag check the workflow asked for. A flag's value
// is the token after it; a missing value or a value that is itself a flag is a
// broken invocation, reported as `${flag} requires a value` rather than as an
// unknown argument for the neighbouring flag.
export function parseCliFlags(
  args: Array<string>,
  known: ReadonlyArray<string> = VERIFY_FLAGS
): Map<string, string> {
  const seen = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }
    if (!known.includes(arg)) {
      throw new Error(`unknown argument ${arg}; expected one of ${known.join(", ")}`);
    }
    if (seen.has(arg)) {
      throw new Error(`${arg} is given more than once`);
    }
    seen.add(arg);
    const value = args[index + 1];
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }
    values.set(arg, value);
    index += 1;
  }
  return values;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flags = parseCliFlags(argv);
  const root = resolve(flags.get("--root") ?? process.cwd());
  const archiveDir = resolve(flags.get("--dir") ?? join(root, "release-artifacts"));
  const manifestPath = resolve(
    flags.get("--manifest") ??
      join(archiveDir, readNpmPublicationAuthority(root).candidateManifestName)
  );
  const manifest = verifyNpmCandidate({
    root,
    manifestPath,
    archiveDir,
    tagVersion: flags.get("--tag-version"),
    sourceCommit: flags.get("--source-commit")
  });
  for (const entry of manifest.packages) {
    process.stdout.write(`${entry.name}@${entry.version} ${entry.sha256} ${entry.tarball}\n`);
  }
}
