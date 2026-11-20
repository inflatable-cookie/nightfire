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
  packages: NpmPublicationPackage[];
};

export function readNpmPublicationAuthority(root: string): NpmPublicationAuthority {
  const manifestPath = join(root, "release-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  const declared: unknown = manifest.npmPublication;
  // `typeof null` is "object", so null and an array need their own refusal.
  if (declared === null || typeof declared !== "object" || Array.isArray(declared)) {
    throw new Error("release manifest must declare npmPublication authority");
  }
  const authority = declared as Record<string, unknown>;
  const candidateManifestName = authority.candidateManifestName;
  if (typeof candidateManifestName !== "string" || candidateManifestName.length === 0) {
    throw new Error("release manifest npmPublication must name its candidate identity manifest");
  }
  if (!Array.isArray(authority.packages) || authority.packages.length === 0) {
    throw new Error("release manifest npmPublication must list at least one package");
  }
  const packages = authority.packages.map((candidate) => {
    if (candidate === null || typeof candidate !== "object") {
      throw new Error("release manifest npmPublication package entries must be objects");
    }
    const entry = candidate as Record<string, unknown>;
    if (typeof entry.name !== "string" || typeof entry.path !== "string") {
      throw new Error("release manifest npmPublication packages need a name and a path");
    }
    return { name: entry.name, path: entry.path };
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
  packages: CandidatePackage[];
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
    throw new Error(`candidate tarball ${basename(tarballPath)} has a malformed package/package.json`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`candidate tarball ${basename(tarballPath)} has a non-object package/package.json`);
  }
  const manifest = parsed as Record<string, unknown>;
  if (typeof manifest.name !== "string" || typeof manifest.version !== "string") {
    throw new Error(`candidate tarball ${basename(tarballPath)} has no name/version`);
  }
  return { name: manifest.name, version: manifest.version };
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
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${origin} must be a JSON object`);
  }
  const document = parsed as Record<string, unknown>;
  if (document.schema !== CANDIDATE_SCHEMA) {
    throw new Error(`${origin} declares schema ${String(document.schema)}, expected ${CANDIDATE_SCHEMA}`);
  }
  if (!Array.isArray(document.packages) || document.packages.length === 0) {
    throw new Error(`${origin} must list at least one package`);
  }
  const packages = document.packages.map((candidate, index) => {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`${origin} package ${index} must be an object`);
    }
    const entry = candidate as Record<string, unknown>;
    return {
      name: requireString(entry, "name", `${origin} package ${index}`),
      path: requireString(entry, "path", `${origin} package ${index}`),
      tarball: requireString(entry, "tarball", `${origin} package ${index}`),
      version: requireString(entry, "version", `${origin} package ${index}`),
      sha256: requireString(entry, "sha256", `${origin} package ${index}`),
    };
  });
  return {
    schema: CANDIDATE_SCHEMA,
    sourceCommit: requireString(document, "sourceCommit", origin),
    version: requireString(document, "version", origin),
    packages,
  };
}

export function readCandidateManifest(path: string): CandidateManifest {
  if (!existsSync(path)) throw new Error(`candidate identity manifest not found: ${path}`);
  return parseCandidateManifest(readFileSync(path, "utf8"), path);
}
