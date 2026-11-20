import { describe, expect, it } from "../vitest";
import { renderEmbed } from "../../src/video/render-embed";

describe("nightfire/video renderEmbed", () => {
  it("returns originalEmbed when present", () => {
    expect(
      renderEmbed({
        provider: "generic",
        id: "x",
        originalEmbed: '<iframe src="https://example.com/e"></iframe>',
      })
    ).toBe('<iframe src="https://example.com/e"></iframe>');
  });

  it("renders the provider allow-list", () => {
    expect(renderEmbed({ provider: "youtube", id: "dQw4w9WgXcQ" })).toBe(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" loading="lazy" allowfullscreen></iframe>'
    );
    expect(renderEmbed({ provider: "vimeo", id: "123456" })).toBe(
      '<iframe src="https://player.vimeo.com/video/123456" loading="lazy" allowfullscreen></iframe>'
    );
    expect(renderEmbed({ provider: "audioboom", id: "99" })).toBe(
      '<iframe src="https://embeds.audioboom.com/posts/99/embed/v5" loading="lazy"></iframe>'
    );
  });

  it("percent-encodes the id so it cannot end the src or add an attribute", () => {
    const html = renderEmbed({
      provider: "youtube",
      id: 'x" onload="alert(1)',
    });
    expect(html).toBe(
      '<iframe src="https://www.youtube.com/embed/x%22%20onload%3D%22alert(1)" loading="lazy" allowfullscreen></iframe>'
    );
    expect(html).not.toContain('onload="');
  });

  it("encodes every provider's id, and leaves a plain id unchanged", () => {
    expect(renderEmbed({ provider: "vimeo", id: "a/b?c#d" })).toContain(
      "https://player.vimeo.com/video/a%2Fb%3Fc%23d"
    );
    expect(renderEmbed({ provider: "audioboom", id: "9 9" })).toContain(
      "https://embeds.audioboom.com/posts/9%209/embed/v5"
    );
    expect(renderEmbed({ provider: "youtube", id: "dQw4w9WgXcQ" })).toContain(
      "/embed/dQw4w9WgXcQ"
    );
  });

  it("returns null for an unknown provider without pasted markup", () => {
    expect(renderEmbed({ provider: "generic", id: "https://example.com/foo" })).toBeNull();
  });
});
