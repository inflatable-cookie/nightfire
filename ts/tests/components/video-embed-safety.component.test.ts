import { describe, expect, it } from "bun:test";
import { render } from "../render";

import "../../src/render-registrations";
import { getBlockRenderer } from "../../src/render-registry";

const VideoRenderer = getBlockRenderer(undefined, "video") as any;

const PASTED_FRAME = '<iframe src="https://example.com/e"></iframe>';

function videoBlock(embed: Record<string, unknown>, title?: string) {
  return {
    type: "video",
    version: "initial",
    data: title === undefined ? { embed } : { embed, title }
  };
}

describe("nightfire/video embed safety", () => {
  it("writes a block title containing $& literally into the frame's title", () => {
    const view = render(VideoRenderer, {
      block: videoBlock(
        { provider: "generic", id: "x", originalEmbed: PASTED_FRAME },
        "Dinner $& $1 $$"
      )
    });
    const frame = view.container.querySelector("iframe")!;
    expect(frame.getAttribute("title")).toBe("Dinner $& $1 $$");
  });

  it("escapes ampersands and quotes in the title", () => {
    const view = render(VideoRenderer, {
      block: videoBlock(
        { provider: "generic", id: "x", originalEmbed: PASTED_FRAME },
        'Tom & "Jerry"'
      )
    });
    expect(view.container.querySelector("iframe")!.getAttribute("title")).toBe('Tom & "Jerry"');
  });

  it("keeps a pasted frame's own title rather than adding a second title attribute", () => {
    const view = render(VideoRenderer, {
      block: videoBlock(
        {
          provider: "generic",
          id: "x",
          originalEmbed: '<iframe src="https://example.com/e" title="Pasted"></iframe>'
        },
        "Block title"
      )
    });
    const frame = view.container.querySelector("iframe")!;
    expect(frame.getAttribute("title")).toBe("Pasted");
    expect(view.container.innerHTML.match(/\stitle=/g)).toHaveLength(1);
  });

  it("renders a whitespace-only originalEmbed inert, not ready", () => {
    const view = render(VideoRenderer, {
      block: videoBlock({ provider: "generic", id: "x", originalEmbed: "   " })
    });
    const root = view.container.querySelector('[data-nightfire-block="video"]')!;
    expect(root.getAttribute("data-embed-state")).toBe("inert");
    expect(root.querySelector("iframe")).toBeNull();
  });

  it("renders an originalEmbed the sanitizer strips to nothing inert", () => {
    const view = render(VideoRenderer, {
      block: videoBlock({
        provider: "generic",
        id: "x",
        originalEmbed: "<script>globalThis.__pwned = true</script>"
      })
    });
    const root = view.container.querySelector('[data-nightfire-block="video"]')!;
    expect(root.getAttribute("data-embed-state")).toBe("inert");
    expect(root.querySelector("script")).toBeNull();
  });

  it("renders a provider embed ready, with its id encoded in the src", () => {
    const view = render(VideoRenderer, {
      block: videoBlock({ provider: "youtube", id: 'a" onload="x' })
    });
    const root = view.container.querySelector('[data-nightfire-block="video"]')!;
    expect(root.getAttribute("data-embed-state")).toBe("ready");
    const frame = root.querySelector("iframe")!;
    expect(frame.getAttribute("src")).toBe("https://www.youtube.com/embed/a%22%20onload%3D%22x");
    expect(frame.hasAttribute("onload")).toBe(false);
  });
});
