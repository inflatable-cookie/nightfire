import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// The repository's Rust commands go through one route (oxide-rust-runner.sh),
// never straight to Cargo. Keeping the decision in the runner means the local
// Oxide route, the CI Cargo route and the explicit `EFFIGY_OXIDE_ESCAPE=cargo`
// escape cannot drift between selectors and scripts.

export type RustRoute = "oxide" | "cargo";

const runner = join(import.meta.dir, "oxide-rust-runner.sh");

function routed(args: string[], capture: boolean, cwd?: string): string {
  const child = Bun.spawnSync(["/bin/sh", runner, ...args], {
    cwd,
    env: { ...process.env },
    stdout: capture ? "pipe" : "inherit",
    stderr: capture ? "pipe" : "inherit",
  });
  if (child.exitCode !== 0) {
    const detail = capture ? child.stderr.toString().trim() : "";
    throw new Error(
      `Rust route ${args.join(" ")} failed with exit ${child.exitCode}` +
        (detail ? `: ${detail}` : ""),
    );
  }
  return capture ? child.stdout.toString() : "";
}

/** Which command the route selects right now. */
export function rustRoute(): RustRoute {
  const route = routed(["mode"], true).trim();
  if (route !== "oxide" && route !== "cargo") {
    throw new Error(`unexpected Rust route: ${route}`);
  }
  return route;
}

/** Runs one Cargo command through the route. */
export function runCargo(args: string[], cwd?: string): void {
  routed(["run", ...args], false, cwd);
}

/** Runs one tool that calls Cargo itself, bound to one Cargo workspace. */
export function runRustTool(manifestPath: string, command: string[], cwd?: string): void {
  routed(["tool", manifestPath, "--", ...command], false, cwd);
}

/** Runs one tool through the route and returns its standard output. */
export function captureRustTool(manifestPath: string, command: string[], cwd?: string): string {
  return routed(["tool", manifestPath, "--", ...command], true, cwd);
}

// Oxide places build output in its managed storage, so it needs the workspace to
// be a Git work tree that ignores `target`; otherwise it refuses rather than
// write an untracked link. A disposable proof workspace is therefore prepared as
// a throwaway repository before Oxide is asked to build in it. Cargo needs no
// such preparation, so the CI and escape routes leave the workspace untouched.
export async function prepareDisposableWorkspace(directory: string): Promise<void> {
  if (rustRoute() !== "oxide") return;
  const init = Bun.spawnSync(["git", "init", "-q"], {
    cwd: directory,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (init.exitCode !== 0) {
    throw new Error(`git init failed in ${directory}`);
  }
  await writeFile(join(directory, ".gitignore"), "/target\n");
}
