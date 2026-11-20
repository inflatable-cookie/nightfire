// Certificate mode: build and pack exactly once, then write the candidate
// identity manifest into the archive directory. Publish mode never runs this --
// it consumes these exact bytes and verifies them against the tag commit.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import {
  CANDIDATE_SCHEMA,
  type CandidateManifest,
  parseCandidateManifest,
  parseTarballManifest,
  readNpmPublicationAuthority,
  sha256File,
  type NpmPublicationAuthority,
} from "./npm-publication";

function headCommit(root: string): string {
  return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

export function writeCandidateManifest(args: {
  root: string;
  archiveDir: string;
  authority?: NpmPublicationAuthority;
}): CandidateManifest {
  const root = resolve(args.root);
  const archiveDir = resolve(args.archiveDir);
  const authority = args.authority ?? readNpmPublicationAuthority(root);
  rmSync(archiveDir, { recursive: true, force: true });
  mkdirSync(archiveDir, { recursive: true });

  const packages: CandidateManifest["packages"] = [];
  let version = "";
  for (const entry of authority.packages) {
    const packageDir = resolve(root, entry.path);
    // One pack per package, into the archive directory. `npm pack` writes the
    // tarball and prints its filename.
    const printed = execFileSync("npm", ["pack", "--pack-destination", archiveDir], {
      cwd: packageDir,
      encoding: "utf8",
    });
    const tarball = basename(printed.trim().split("\n").pop() ?? "");
    if (tarball.length === 0) {
      throw new Error(`npm pack produced no tarball name for ${entry.name}`);
    }
    const tarballPath = join(archiveDir, tarball);
    const inner = parseTarballManifest(tarballPath);
    if (inner.name !== entry.name) {
      throw new Error(`packed tarball declares ${inner.name}@${inner.version}, expected ${entry.name}`);
    }
    if (version === "") version = inner.version;
    else if (version !== inner.version) {
      throw new Error(`packages are not lockstep: ${entry.name} is ${inner.version}, expected ${version}`);
    }
    packages.push({
      name: entry.name,
      path: entry.path,
      tarball,
      version: inner.version,
      sha256: sha256File(tarballPath),
    });
  }

  const manifest: CandidateManifest = {
    schema: CANDIDATE_SCHEMA,
    sourceCommit: headCommit(root),
    version,
    packages,
  };
  const manifestPath = join(archiveDir, authority.candidateManifestName);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

if (import.meta.main) {
  const root = resolve(process.env.NIGHTFIRE_NPM_ROOT ?? process.cwd());
  const archiveDir = resolve(
    process.env.NIGHTFIRE_NPM_ARCHIVE_OUT ?? join(root, "release-artifacts"),
  );
  const manifest = writeCandidateManifest({ root, archiveDir });
  process.stdout.write(
    `candidate ${manifest.version} from ${manifest.sourceCommit.slice(0, 9)}\n` +
      manifest.packages
        .map((entry) => `  ${entry.name}@${entry.version} ${entry.tarball} ${entry.sha256}\n`)
        .join(""),
  );
  // Read the written manifest back through the same parser publish mode uses,
  // so a malformed manifest cannot leave the certificate step green.
  const readBack = parseCandidateManifest(
    readFileSync(
      join(archiveDir, readNpmPublicationAuthority(root).candidateManifestName),
      "utf8",
    ),
    "written candidate identity manifest",
  );
  if (JSON.stringify(readBack) !== JSON.stringify(manifest)) {
    throw new Error("written candidate identity manifest does not round-trip");
  }
}
