// Certificate mode: build and pack exactly once, then write the candidate
// identity manifest into the archive directory. Publish mode never runs this --
// it consumes these exact bytes and verifies them against the tag commit.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { readNpmPublicationAuthority, type NpmPublicationAuthority } from "./npm-publication";

const CANDIDATE_SCHEMA = "nightfire.npm-candidate.v1";

export type CandidateManifest = {
  schema: string;
  sourceCommit: string;
  version: string;
  packages: { name: string; path: string; tarball: string; version: string; sha256: string }[];
};

function sha256File(path: string): string {
  const out = execFileSync("shasum", ["-a", "256", path], { encoding: "utf8" });
  return out.trim().split(/\s+/)[0];
}

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
    const inner = JSON.parse(
      execFileSync("tar", ["-xzOf", tarballPath, "package/package.json"], { encoding: "utf8" }),
    ) as { name?: string; version?: string };
    if (inner.name !== entry.name || typeof inner.version !== "string") {
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
  writeFileSync(
    join(archiveDir, authority.candidateManifestName),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
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
  // Read back once so a malformed manifest cannot leave the step green.
  readFileSync(join(archiveDir, readNpmPublicationAuthority(root).candidateManifestName), "utf8");
}
