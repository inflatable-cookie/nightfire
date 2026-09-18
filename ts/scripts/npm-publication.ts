// Spec 071 pattern: `release-manifest.json` is the one machine-readable npm
// publication authority. Scripts, the archive certificate and the release
// workflow take package paths from here instead of repeating them, so a release
// cannot publish something the authority does not declare.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type NpmPublicationPackage = { name: string; path: string };

export type NpmPublicationAuthority = {
  candidateManifestName: string;
  packages: NpmPublicationPackage[];
};

export function readNpmPublicationAuthority(root: string): NpmPublicationAuthority {
  const manifestPath = join(root, "release-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  const authority = manifest.npmPublication as Record<string, unknown> | undefined;
  if (authority === undefined || typeof authority !== "object") {
    throw new Error("release manifest must declare npmPublication authority");
  }
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
