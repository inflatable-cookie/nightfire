// Spec 071 pattern: `release-manifest.json` is the one machine-readable npm
// publication authority. Scripts, the archive certificate and the release
// workflow take package paths from here instead of repeating them, so a release
// cannot publish something the authority does not declare.
//
// The candidate identity manifest lives here too. The archive step writes it
// and the verification step reads it, so its schema, its hash and its tarball
// reader are stated once rather than copied into both.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export type NpmPublicationPackage = { name: string; path: string };

export type NpmPublicationAuthority = {
  candidateManifestName: string;
  packages: Array<NpmPublicationPackage>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readNpmPublicationAuthority(root: string): NpmPublicationAuthority {
  const manifestPath = join(root, "release-manifest.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  const declared: unknown = isRecord(manifest) ? manifest.npmPublication : null;
  // `typeof null` is "object", so null and an array need their own refusal.
  if (!isRecord(declared)) {
    throw new Error("release manifest must declare npmPublication authority");
  }
  const candidateManifestName = declared.candidateManifestName;
  if (typeof candidateManifestName !== "string" || candidateManifestName.length === 0) {
    throw new Error("release manifest npmPublication must name its candidate identity manifest");
  }
  if (!Array.isArray(declared.packages) || declared.packages.length === 0) {
    throw new Error("release manifest npmPublication must list at least one package");
  }
  const rawPackages: Array<unknown> = declared.packages;
  const packages = rawPackages.map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error("release manifest npmPublication package entries must be objects");
    }
    if (typeof candidate.name !== "string" || typeof candidate.path !== "string") {
      throw new Error("release manifest npmPublication packages need a name and a path");
    }
    return { name: candidate.name, path: candidate.path };
  });
  return { candidateManifestName, packages };
}

export const CANDIDATE_SCHEMA = "nightfire.npm-candidate.v1";

export type CandidatePackage = {
  name: string;
  path: string;
  tarball: string;
  version: string;
  sha256: string;
};

export type CandidateManifest = {
  schema: string;
  sourceCommit: string;
  version: string;
  packages: Array<CandidatePackage>;
};

// `node:crypto` rather than a `shasum` shell-out: the digest is the same, and
// the proof does not depend on a Perl script that macOS and Linux carry
// differently.
export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function parseTarballManifest(tarballPath: string): { name: string; version: string } {
  let raw: string;
  try {
    raw = execFileSync("tar", ["-xzOf", tarballPath, "package/package.json"], { encoding: "utf8" });
  } catch {
    throw new Error(`candidate tarball ${basename(tarballPath)} has no package/package.json`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `candidate tarball ${basename(tarballPath)} has a malformed package/package.json`
    );
  }
  if (!isRecord(parsed)) {
    throw new Error(
      `candidate tarball ${basename(tarballPath)} has a non-object package/package.json`
    );
  }
  if (typeof parsed.name !== "string" || typeof parsed.version !== "string") {
    throw new Error(`candidate tarball ${basename(tarballPath)} has no name/version`);
  }
  return { name: parsed.name, version: parsed.version };
}

function requireString(entry: Record<string, unknown>, key: string, origin: string): string {
  const value = entry[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${origin} must declare a non-empty string ${key}`);
  }
  return value;
}

// Read a candidate identity manifest back with the structure checked explicitly,
// so a truncated or hand-edited manifest reports which field is wrong instead of
// failing later on an undefined property.
export function parseCandidateManifest(raw: string, origin: string): CandidateManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${origin} is not valid JSON`);
  }
  if (!isRecord(parsed)) {
    throw new Error(`${origin} must be a JSON object`);
  }
  if (parsed.schema !== CANDIDATE_SCHEMA) {
    throw new Error(
      `${origin} declares schema ${String(parsed.schema)}, expected ${CANDIDATE_SCHEMA}`
    );
  }
  if (!Array.isArray(parsed.packages) || parsed.packages.length === 0) {
    throw new Error(`${origin} must list at least one package`);
  }
  const rawPackages: Array<unknown> = parsed.packages;
  const packages = rawPackages.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`${origin} package ${index} must be an object`);
    }
    return {
      name: requireString(candidate, "name", `${origin} package ${index}`),
      path: requireString(candidate, "path", `${origin} package ${index}`),
      tarball: requireString(candidate, "tarball", `${origin} package ${index}`),
      version: requireString(candidate, "version", `${origin} package ${index}`),
      sha256: requireString(candidate, "sha256", `${origin} package ${index}`)
    };
  });
  return {
    schema: CANDIDATE_SCHEMA,
    sourceCommit: requireString(parsed, "sourceCommit", origin),
    version: requireString(parsed, "version", origin),
    packages
  };
}

export function readCandidateManifest(path: string): CandidateManifest {
  if (!existsSync(path)) {
    throw new Error(`candidate identity manifest not found: ${path}`);
  }
  return parseCandidateManifest(readFileSync(path, "utf8"), path);
}
