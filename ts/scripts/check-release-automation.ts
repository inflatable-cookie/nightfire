// Spec 071 pattern: the release-automation guard proves STRUCTURE, not
// incidental workflow steps.
//
// It requires: a dispatch-driven release workflow with explicit candidate and
// publish modes; a Linux runner with a hard ten-minute timeout; candidate
// artifact and publish-time identity checks; publication of archives rather
// than package directories; tag and publish-mode mutation guards; and a
// publication set derived from `release-manifest.json` rather than repeated in
// the workflow.
//
// It is deliberately static: no dispatch, no registry, no network, no workflow
// execution. A workflow can silently lose a guard -- someone deletes the
// identity check, publishing still works, and nobody notices until a bad
// release ships -- so the properties are asserted as text.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { readNpmPublicationAuthority } from "./npm-publication";

const WORKFLOW = ".github/workflows/release.yml";

export function checkReleaseAutomation(root: string): string[] {
  const errors: string[] = [];
  const path = join(root, WORKFLOW);
  if (!existsSync(path)) return [`${WORKFLOW} is missing`];
  const text = readFileSync(path, "utf8");

  const require = (condition: boolean, message: string) => {
    if (!condition) errors.push(message);
  };
  const requireText = (needle: string, message: string) => require(text.includes(needle), message);

  // Dispatch with explicit modes; publication is never a side effect of a push.
  requireText("workflow_dispatch:", "release workflow must be dispatch-driven");
  requireText("options: [candidate, publish]", "release workflow must offer candidate and publish modes");
  requireText("candidate-run-id", "release workflow must accept the candidate run id to publish");
  require(
    !/^\s{2}(push|pull_request):/m.test(text),
    "release workflow must not run on push or pull_request",
  );

  // Least privilege at the top; the elevation is per job.
  require(/^permissions:\n\s+contents: read$/m.test(text), "release workflow must default to contents: read");
  requireText("id-token: write", "publishing needs id-token: write for npm trusted publishing");
  requireText("actions: read", "publishing needs actions: read to fetch the candidate archive set");

  // Runner and ceiling.
  requireText("runs-on: ubuntu-", "release workflow must run on a Linux runner");
  requireText("timeout-minutes: 10", "release workflow must carry a hard ten-minute ceiling");

  // Mutation guards: publication is an act against a versioned tag.
  requireText("refs/tags/v", "publish mode must require a versioned tag");
  require(
    /candidate-run-id == ''/.test(text),
    "publish mode must require a candidate run id",
  );

  // Candidate mode certifies; it never publishes.
  requireText("effigy release:npm-certificate", "candidate mode must run the Effigy certificate");
  require(
    /name: nightfire-npm-candidate/.test(text),
    "candidate mode must upload a named candidate artifact",
  );
  requireText("if-no-files-found: error", "candidate upload must fail when the archive set is empty");

  // Publish mode verifies identity before any npm mutation, then publishes the
  // exact archives -- never a directory.
  requireText("gh run download", "publish mode must download the certified candidate run");
  requireText("--tag-version", "publish mode must verify the candidate against the tag version");
  requireText("--source-commit", "publish mode must verify the candidate against the tag commit");
  require(
    /npm publish "\.\/\$tarball" --access public/.test(text),
    "publish mode must publish the certified tarballs with public access",
  );
  require(
    !/npm publish \.(?:\s|$)/m.test(text) && !/npm publish release-artifacts(?:\s|$)/m.test(text),
    "publish mode must never publish a package directory",
  );

  // The publication set comes from the authority, not from the workflow.
  const authority = readNpmPublicationAuthority(resolve(root));
  for (const entry of authority.packages) {
    require(
      !text.includes(entry.name) && !text.includes(`"${entry.path}"`),
      `release workflow must not name ${entry.name} or its path; the publication set is derived from release-manifest.json`,
    );
  }

  return errors;
}

if (import.meta.main) {
  const root = resolve(process.env.NIGHTFIRE_NPM_ROOT ?? process.cwd());
  const errors = checkReleaseAutomation(root);
  if (errors.length > 0) {
    for (const error of errors) process.stderr.write(`release-automation: ${error}\n`);
    process.exit(1);
  }
  process.stdout.write("release-automation: candidate/publish structure, mutation guards and archive-only publication verified\n");
}
