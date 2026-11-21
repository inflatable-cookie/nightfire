const commands: Array<[string, Array<string>]> = [
  ["ssr", ["bun", "test", "ts/tests/security/sanitization.test.ts"]],
  [
    "browser",
    [
      "bun",
      "--conditions=browser",
      "test",
      "--preload",
      "./ts/tests/setup/component.ts",
      "ts/tests/security/sanitization.test.ts"
    ]
  ],
  [
    "tauri",
    [
      "bun",
      "--conditions=browser",
      "test",
      "--preload",
      "./ts/tests/setup/component.ts",
      "ts/tests/security/sanitization.test.ts"
    ]
  ]
];

for (const [runtime, command] of commands) {
  const child = Bun.spawnSync(command, {
    env: { ...process.env, NIGHTFIRE_RUNTIME: runtime },
    stdout: "inherit",
    stderr: "inherit"
  });
  // A signal-killed child reports `exitCode: null`; `?? 1` keeps that failure
  // from exiting 0.
  if (child.exitCode !== 0) {
    process.exit(child.exitCode ?? 1);
  }
}
