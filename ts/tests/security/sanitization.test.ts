import { describe, expect, it } from "../vitest";
import cases from "../fixtures/security/malicious-markdown-v1.json";
import { renderSafeMarkdownPreview } from "../../src/markup/markdown-preview";

const runtime = process.env.NIGHTFIRE_RUNTIME ?? "ssr";

describe(`markdown sanitization (${runtime})`, () => {
  it("runs in the requested execution environment", () => {
    if (runtime === "ssr") {
      expect(typeof window).toBe("undefined");
      return;
    }
    expect(typeof window).toBe("object");
    if (runtime === "tauri") {
      expect("__TAURI_INTERNALS__" in window).toBe(true);
    }
  });

  for (const fixture of cases) {
    it(`sanitizes ${fixture.name}`, () => {
      const html = renderSafeMarkdownPreview(fixture.input);
      for (const text of fixture.mustContain) expect(html).toContain(text);
      for (const text of fixture.mustNotContain) expect(html.toLowerCase()).not.toContain(text.toLowerCase());
      expect((globalThis as { __nightfirePwned?: boolean }).__nightfirePwned).toBeUndefined();
    });
  }
});
