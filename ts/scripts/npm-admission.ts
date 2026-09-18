// Admission: refuse to certify a candidate that does not correspond to a
// committed head. The candidate manifest binds `sourceCommit`, so certifying a
// dirty tree would produce an artefact whose recorded provenance is false --
// and the git-consumer proofs install from the pushed commit, so a dirty head
// is either unprovable or lies about what was packed.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { readNpmPublicationAuthority } from "./npm-publication";

if (import.meta.main) {
  const root = resolve(process.env.NIGHTFIRE_NPM_ROOT ?? process.cwd());
  const authority = readNpmPublicationAuthority(root);

  const dirty = execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (dirty.length > 0) {
    throw new Error(
      `admission requires a clean exact head; ${dirty.length} path(s) are modified or untracked:\n` +
        dirty.map((line) => `  ${line}`).join("\n"),
    );
  }

  const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  process.stdout.write(
    `admission ok: ${authority.packages.length} package(s) at ${head.slice(0, 9)}; ` +
      `authority declares candidate manifest ${authority.candidateManifestName}\n`,
  );
}
