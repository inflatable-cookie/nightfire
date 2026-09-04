import { lstat, realpath } from "node:fs/promises";

const manifest = await Bun.file("package.json").json();
const workspace = await Bun.file("Cargo.toml").text();
const crate = await Bun.file("rust/nightfire/Cargo.toml").text();

const cargoVersion = workspace.match(/^version = "([^"]+)"$/m)?.[1];
if (!cargoVersion) throw new Error("root Cargo workspace version is missing");
if (manifest.version !== cargoVersion) {
  throw new Error(`version mismatch: npm ${manifest.version}, Cargo ${cargoVersion}`);
}
if (!/^name = "nightfire"$/m.test(crate) || !/^version\.workspace = true$/m.test(crate)) {
  throw new Error("Rust crate must be package nightfire and inherit the workspace version");
}

const tsFixtureTest = await Bun.file("ts/tests/wire/conformance.test.ts").text();
const rustFixtureTest = await Bun.file("rust/nightfire/tests/wire_conformance.rs").text();
for (const [language, source] of [["TypeScript", tsFixtureTest], ["Rust", rustFixtureTest]]) {
  if (!source.includes("fixtures/wire/v1/nightfire-values.json")) {
    throw new Error(`${language} does not consume the shared root wire fixture`);
  }
}

const rootFixture = "fixtures/wire/v1/nightfire-values.json";
const cargoFixture = "rust/nightfire/fixtures/wire/v1/nightfire-values.json";
if (!(await lstat(cargoFixture)).isSymbolicLink()) {
  throw new Error("Cargo fixture must be a tracked alias, not a second authored copy");
}
if (await realpath(cargoFixture) !== await realpath(rootFixture)) {
  throw new Error("Cargo fixture alias does not resolve to the shared root fixture");
}

console.log(`version sync passed: npm and Cargo ${cargoVersion}; both languages and Cargo packaging consume root wire v1`);
