import { afterEach, describe, expect, it } from "bun:test";
import { render } from "../render";

import "../../src/render-registrations";
import NightfireRenderer from "../../src/NightfireRenderer.svelte";
import { getBlockRenderer } from "../../src/render-registry";
import {
  registerMediaSource,
  unregisterMediaSource,
  type MediaSource,
  type ResolvedMedia,
} from "../../src/media-source";

const ImageRenderer = getBlockRenderer(undefined, "image") as any;
const DownloadCardRenderer = getBlockRenderer(undefined, "download_card") as any;
const ItemListRenderer = getBlockRenderer(undefined, "item_list") as any;

function sourceResolving(resolve: (media_id: string) => ResolvedMedia | null): MediaSource {
  return {
    pick: async () => null,
    resolve: ({ media_id }) => resolve(media_id),
  };
}

function throwingSource(): MediaSource {
  return {
    pick: async () => null,
    resolve: () => {
      throw new Error("library unavailable");
    },
  };
}

const imageBlock = {
  type: "image",
  version: "initial",
  data: { media_id: "img-1", alt: "A hero", caption: "Seen from the ridge" },
};

const downloadBlock = {
  type: "download_card",
  version: "initial",
  data: {
    description: "Read before the walk",
    files: [{ media_id: "m-1", title: "Trail map", description: "Printable" }],
  },
};

afterEach(() => {
  unregisterMediaSource();
});

describe("nightfire/media resolution safety", () => {
  it("renders an image inert when the source throws, and does not throw", () => {
    registerMediaSource(throwingSource());
    const view = render(ImageRenderer, { block: imageBlock });
    const figure = view.container.querySelector('[data-nightfire-block="image"]')!;
    expect(figure.getAttribute("data-media-state")).toBe("inert");
    expect(view.container.querySelector("img")).toBeNull();
    expect(figure.querySelector("[data-image-caption]")?.textContent).toBe("Seen from the ridge");
  });

  it("renders an image inert when the resolution has no URL", () => {
    registerMediaSource(sourceResolving(() => ({ url: "", filename: "hero.jpg" })));
    const view = render(ImageRenderer, { block: imageBlock });
    expect(
      view.container.querySelector('[data-nightfire-block="image"]')!.getAttribute("data-media-state")
    ).toBe("inert");
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("renders an image from a resolved URL", () => {
    registerMediaSource(
      sourceResolving(() => ({ url: "https://files.example/hero.jpg", filename: "hero.jpg" }))
    );
    const view = render(ImageRenderer, { block: imageBlock });
    expect(view.container.querySelector("img")!.getAttribute("src")).toBe(
      "https://files.example/hero.jpg"
    );
  });

  it("keeps a download row's title and description when the source throws", () => {
    registerMediaSource(throwingSource());
    const view = render(DownloadCardRenderer, { block: downloadBlock });
    expect(view.container.textContent).toContain("Read before the walk");
    expect(view.container.textContent).toContain("Trail map");
    expect(view.container.querySelector("a")).toBeNull();
    expect(
      view.container.querySelector("[data-download-card-file]")!.getAttribute("data-media-state")
    ).toBe("inert");
  });

  it.each([
    ["javascript:", "javascript:globalThis.__pwned=true"],
    ["data:", "data:text/html;base64,PHNjcmlwdD4="],
    ["vbscript:", "vbscript:msgbox(1)"],
  ])("refuses a download href with a %s scheme and keeps the row inert", (_label, url) => {
    registerMediaSource(sourceResolving(() => ({ url, filename: "trail.pdf" })));
    const view = render(DownloadCardRenderer, { block: downloadBlock });
    expect(view.container.querySelector("a")).toBeNull();
    expect(
      view.container.querySelector("[data-download-card-file]")!.getAttribute("data-media-state")
    ).toBe("inert");
  });

  it("admits a web, blob or relative download href", () => {
    for (const url of ["https://files.example/map.pdf", "blob:https://app.example/1", "/files/map.pdf"]) {
      registerMediaSource(sourceResolving(() => ({ url, filename: "map.pdf" })));
      const view = render(DownloadCardRenderer, { block: downloadBlock });
      expect(view.container.querySelector("a")!.getAttribute("href")).toBe(url);
    }
  });
});

describe("nightfire/container renderers", () => {
  it("renders a markdown child inside an item list", () => {
    const view = render(ItemListRenderer, {
      block: {
        data: {
          items: [{ title: "Step one", body: { type: "markdown", data: { text: "**Mix** well" } } }],
        },
      },
      schema: "consumer.test",
    });
    expect(view.container.querySelector('[data-nightfire-block="markdown"] strong')?.textContent).toBe(
      "Mix"
    );
  });

  it("renders every block when blocks carry no id", () => {
    const view = render(NightfireRenderer, {
      value: {
        blocks: [
          { type: "markdown", data: { text: "first" } },
          { type: "markdown", data: { text: "second" } },
        ],
      },
    });
    const markdown = view.container.querySelectorAll('[data-nightfire-block="markdown"]');
    expect(markdown).toHaveLength(2);
    expect(markdown[1]!.textContent?.trim()).toBe("second");
  });
});
