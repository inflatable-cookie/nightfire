import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const kind = process.argv[2];
if (kind !== "npm" && kind !== "cargo") {
  throw new Error("usage: bun ts/scripts/check-git-consumer.ts <npm|cargo>");
}

function run(command: string[], cwd?: string, env?: Record<string, string>) {
  const child = Bun.spawnSync(command, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
  if (child.exitCode !== 0) throw new Error(`${command.join(" ")} failed`);
}

const status = Bun.spawnSync(["git", "status", "--porcelain"], { stdout: "pipe" });
if (status.exitCode !== 0 || status.stdout.toString().trim()) {
  throw new Error("Git-consumer proof requires a clean exact repository head");
}
const revision = Bun.spawnSync(["git", "rev-parse", "HEAD"], { stdout: "pipe" })
  .stdout.toString().trim();
const origin = Bun.spawnSync(["git", "remote", "get-url", "origin"], { stdout: "pipe" });
if (origin.exitCode !== 0) throw new Error("origin Git URL is required for consumer proof");
const repository = process.env.NIGHTFIRE_GIT_URL ?? origin.stdout.toString().trim();
const destination = await mkdtemp(join(tmpdir(), `nightfire-${kind}-consumer-`));

try {
  if (kind === "npm") {
    await Bun.write(join(destination, "package.json"), '{"name":"nightfire-git-consumer","private":true,"type":"module"}\n');
    run(["bun", "add", `git+${repository}#${revision}`], destination);
    run([
      "bun",
      "-e",
      'import { prepareNightfireForSave } from "@inflatable-cookie/nightfire/validation"; const value = prepareNightfireForSave({schema:"proof",blocks:[{type:"markdown",version:"initial",data:{text:"ok"}}]}); if (!value.blocks[0]?.id?.startsWith("nf_")) process.exit(1)',
    ], destination);
  } else {
    await mkdir(join(destination, "src"));
    await Bun.write(join(destination, "Cargo.toml"), `[package]\nname = "nightfire-git-consumer"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\nnightfire = { git = "${repository}", rev = "${revision}" }\nserde_json = "1"\n`);
    await Bun.write(join(destination, "src/main.rs"), 'use nightfire::{BlockData, NightfireValue};\nfn main() { let value = NightfireValue::single("proof", BlockData::new("markdown", serde_json::json!({"text":"ok"}))); assert!(value.blocks[0].id.starts_with("nf_")); }\n');
    run(["cargo", "run", "--quiet"], destination, {
      CARGO_TARGET_DIR: join(destination, "target"),
    });
  }
  console.log(`${kind} Git-consumer proof passed at ${revision}`);
} finally {
  await rm(destination, { recursive: true, force: true });
}
