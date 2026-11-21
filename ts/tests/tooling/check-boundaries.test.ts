import { describe, expect, it } from "bun:test";
import {
  forbiddenPackageImport,
  importedRefs,
  runtimePackageClosure,
  stripComments
} from "../../scripts/check-boundaries";

describe("tooling/check-boundaries", () => {
  it("blanks comments while preserving strings and line breaks", () => {
    const source = `const url = "https://example.test/*path*/"; // hidden import("zod")\n/* block\ncomment */ import "safe";`;
    const stripped = stripComments(source);

    expect(stripped).toContain('"https://example.test/*path*/"');
    expect(stripped).not.toContain("hidden import");
    expect(stripped.split("\n")).toHaveLength(source.split("\n").length);
    expect(importedRefs("source.ts", stripped).map((ref) => ref.specifier)).toEqual(["safe"]);
  });

  it("recognizes static, type-only, side-effect and spaced dynamic imports", () => {
    const refs = importedRefs(
      "source.ts",
      `import value from "static-package";\nimport type { Shape } from "type-package";\nimport "side-effect-package";\nvoid import ( "dynamic-package" );`
    );

    expect(refs).toEqual([
      { specifier: "static-package", typeOnly: false },
      { specifier: "type-package", typeOnly: true },
      { specifier: "side-effect-package", typeOnly: false },
      { specifier: "dynamic-package", typeOnly: false }
    ]);
  });

  it("detects forbidden packages and their subpaths", () => {
    expect(forbiddenPackageImport("source.ts", `import "zod";`)).toBe("zod");
    expect(forbiddenPackageImport("source.ts", `import x from "zod/core";`)).toBe("zod/core");
    expect(forbiddenPackageImport("source.ts", `import x from "safe-package";`)).toBeUndefined();
  });

  it("follows nested non-hoisted Bun lock package keys", () => {
    const runtimePackages = runtimePackageClosure(
      { wrapper: "1.0.0" },
      {
        wrapper: ["wrapper@1.0.0", "", { dependencies: { zod: "3.0.0" } }],
        "wrapper@1.0.0/zod": ["zod@3.0.0", "", {}]
      }
    );

    expect(runtimePackages).toEqual(new Set(["wrapper", "zod"]));
  });
});
