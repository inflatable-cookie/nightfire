const commands = [
  ["ssr", ["bun", "test", "ts/tests/security/sanitization.test.ts"]],
  ["browser", ["bun", "--conditions=browser", "test", "--preload", "./ts/tests/setup/component.ts", "ts/tests/security/sanitization.test.ts"]],
  ["tauri", ["bun", "--conditions=browser", "test", "--preload", "./ts/tests/setup/component.ts", "ts/tests/security/sanitization.test.ts"]],
] as const;

for (const [runtime, command] of commands) {
  const child = Bun.spawnSync(command, {
    env: { ...process.env, NIGHTFIRE_RUNTIME: runtime },
    stdout: "inherit",
    stderr: "inherit",
  });
  if (child.exitCode !== 0) process.exit(child.exitCode);
}
