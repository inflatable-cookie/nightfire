// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "../vitest";
import { fireEvent, render, waitFor, within } from "../render";

import "../../src/render-registrations";
import "../../src/editor-registrations";
import { getBlockRenderer } from "../../src/render-registry";
import { getBlockEditor, isBlockContentEmpty } from "../../src/editor-registry";
import {
  MediaKind,
  registerMediaSource,
  unregisterMediaSource,
  type MediaSource,
  type ResolvedMedia,
} from "../../src/media-source";
import { createRichTextImageRequest } from "../../src/rich-text/images";

const RendererComponent = getBlockRenderer(undefined, "image");
const EditorComponent = getBlockEditor(undefined, "image");

const resolvedByRef: Record<string, ResolvedMedia> = {
  "img-1": {
    url: "https://files.example/hero.jpg",
    filename: "hero.jpg",
    width: 1600,
    height: 900,
    title: "Library title",
  },
  "img-2": {
    url: "https://files.example/icon.png",
    filename: "icon.png",
  },
};

function stubSource(overrides: Partial<MediaSource> = {}): MediaSource {
  return {
    pick: async () => null,
    resolve: (reference) => resolvedByRef[reference.media_id] ?? null,
    ...overrides,
  };
}

const sizedBlock = {
  type: "image",
  version: "initial",
  data: {
    media_id: "img-1",
    alt: "A hero shot",
    title: "Author title",
    caption: "Seen from the ridge",
    sizing: "medium",
  },
};

afterEach(() => {
  unregisterMediaSource();
});

describe("nightfire/image block", () => {
  it("registers both parts", () => {
    expect(RendererComponent).toBeTruthy();
    expect(EditorComponent).toBeTruthy();
  });

  it("answers emptiness from the reference alone", () => {
    expect(isBlockContentEmpty({ type: "image", data: {} })).toBe(true);
    expect(isBlockContentEmpty({ type: "image", data: { alt: "x" } })).toBe(true);
    expect(isBlockContentEmpty({ type: "image", data: { media_id: "  " } })).toBe(true);
    expect(isBlockContentEmpty({ type: "image", data: { media_id: "img-1" } })).toBe(false);
  });

  it("renders a resolved image with intrinsic dimensions and no style", () => {
    registerMediaSource(stubSource());

    const view = render(RendererComponent as any, { block: sizedBlock });
    const root = view.container.querySelector('[data-nightfire-block="image"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("class")).toBeNull();
    expect(root!.getAttribute("style")).toBeNull();
    expect(root!.getAttribute("data-sizing")).toBe("medium");
    expect(root!.getAttribute("data-media-state")).toBe("resolved");

    const img = view.container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://files.example/hero.jpg");
    expect(img.getAttribute("alt")).toBe("A hero shot");
    expect(img.getAttribute("title")).toBe("Author title");
    expect(img.getAttribute("width")).toBe("1600");
    expect(img.getAttribute("height")).toBe("900");
    expect(img.getAttribute("style")).toBeNull();

    expect(view.container.querySelector("[data-image-caption]")!.textContent).toBe(
      "Seen from the ridge"
    );
  });

  it("renders without dimensions when the source provides none", () => {
    registerMediaSource(stubSource());

    const view = render(RendererComponent as any, {
      block: { type: "image", version: "initial", data: { media_id: "img-2", alt: "icon" } },
    });
    const img = view.container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://files.example/icon.png");
    expect(img.getAttribute("width")).toBeNull();
    expect(img.getAttribute("height")).toBeNull();
    expect(view.container.querySelector("[data-image-caption]")).toBeNull();
  });

  it("renders natural size when sizing is absent and degrades unknown presets", () => {
    registerMediaSource(stubSource());

    const natural = render(RendererComponent as any, {
      block: { type: "image", version: "initial", data: { media_id: "img-1" } },
    });
    const naturalRoot = natural.container.querySelector('[data-nightfire-block="image"]');
    expect(naturalRoot).toBeTruthy();
    expect(naturalRoot!.hasAttribute("data-sizing")).toBe(false);
    expect(naturalRoot!.getAttribute("style")).toBeNull();

    const unknown = render(RendererComponent as any, {
      block: {
        type: "image",
        version: "initial",
        data: { media_id: "img-1", sizing: "1200px" },
      },
    });
    const unknownRoot = unknown.container.querySelector('[data-nightfire-block="image"]');
    expect(unknownRoot).toBeTruthy();
    expect(unknownRoot!.hasAttribute("data-sizing")).toBe(false);
  });

  it("renders nothing with no reference and inert output for unknown references", () => {
    registerMediaSource(stubSource());

    for (const data of [{}, { alt: "x" }, { media_id: "  " }]) {
      const view = render(RendererComponent as any, {
        block: { type: "image", version: "initial", data },
      });
      expect(view.container.querySelector('[data-nightfire-block="image"]')).toBeNull();
    }

    const unknown = render(RendererComponent as any, {
      block: {
        type: "image",
        version: "initial",
        data: { media_id: "missing", alt: "x", caption: "kept" },
      },
    });
    const root = unknown.container.querySelector('[data-nightfire-block="image"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("data-media-state")).toBe("inert");
    expect(unknown.container.querySelector("img")).toBeNull();
    // The author's own text survives an unresolvable reference.
    expect(unknown.container.querySelector("[data-image-caption]")!.textContent).toBe("kept");

    unregisterMediaSource();
    const noSource = render(RendererComponent as any, { block: sizedBlock });
    const inert = noSource.container.querySelector('[data-nightfire-block="image"]');
    expect(inert).toBeTruthy();
    expect(inert!.getAttribute("data-media-state")).toBe("inert");
    expect(noSource.container.querySelector("img")).toBeNull();
  });

  it("round-trips a single image pick with alt text next to the picker", async () => {
    const pick = vi.fn(async () => [{ media_id: "img-1" }]);
    registerMediaSource(stubSource({ pick }));

    const onChange = vi.fn();
    const view = render(EditorComponent as any, {
      block: { type: "image", version: "initial", data: {} },
      onChange,
    });

    await fireEvent.click(
      await waitFor(() => within(view.container).getByRole("button", { name: /choose image/i }))
    );

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    // The picker is asked for a single image, not an open multi-pick.
    expect(pick).toHaveBeenCalledWith({ multiple: false, filterKind: MediaKind.Image });
    const afterPick = onChange.mock.calls.at(-1)![0];
    expect(afterPick.type).toBe("image");
    // A URL is never stored: the reference round-trips alone.
    expect(afterPick.data).toEqual({ media_id: "img-1" });
    expect(JSON.stringify(afterPick)).not.toContain("https://files.example");

    // The parent feeds the emitted block back; the row shows the resolved
    // filename and the alt field sits next to the picker.
    const editor = render(EditorComponent as any, { block: afterPick, onChange });
    expect(
      editor.container.querySelector(".underlay-image-editor__file-name")!.textContent
    ).toBe("hero.jpg");
    const altInput = editor.container.querySelector(
      'input[placeholder="Alt text"]'
    ) as HTMLInputElement;
    expect(altInput).toBeTruthy();
    await fireEvent.input(altInput, { target: { value: "A hero shot" } });
    await waitFor(() => expect(onChange.mock.calls.length).toBe(2));
    expect(onChange.mock.calls.at(-1)![0].data).toEqual({
      media_id: "img-1",
      alt: "A hero shot",
    });
  });

  it("changes nothing when the picker is cancelled", async () => {
    registerMediaSource(stubSource({ pick: async () => null }));

    const onChange = vi.fn();
    const view = render(EditorComponent as any, {
      block: { type: "image", version: "initial", data: {} },
      onChange,
    });

    await fireEvent.click(
      await waitFor(() => within(view.container).getByRole("button", { name: /choose image/i }))
    );
    await waitFor(() =>
      expect(
        within(view.container).getByRole("button", { name: /choose image/i })
      ).toBeTruthy()
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("survives the scenario oracle: pick, size, save, reload, then unregister", async () => {
    registerMediaSource(stubSource({ pick: async () => [{ media_id: "img-1" }] }));

    const onChange = vi.fn();
    const editorView = render(EditorComponent as any, {
      block: { type: "image", version: "initial", data: {} },
      onChange,
    });
    await fireEvent.click(
      await waitFor(() => within(editorView.container).getByRole("button", { name: /choose image/i }))
    );
    await waitFor(() => expect(onChange).toHaveBeenCalled());

    const saved = {
      ...onChange.mock.calls.at(-1)![0],
      data: { ...onChange.mock.calls.at(-1)![0].data, alt: "A hero shot", sizing: "medium" },
    };

    const firstRender = render(RendererComponent as any, { block: saved });
    const root = firstRender.container.querySelector('[data-nightfire-block="image"]');
    expect(root!.getAttribute("data-sizing")).toBe("medium");
    expect(root!.getAttribute("style")).toBeNull();

    unregisterMediaSource();
    const secondRender = render(RendererComponent as any, { block: saved });
    const inert = secondRender.container.querySelector('[data-nightfire-block="image"]');
    expect(inert).toBeTruthy();
    expect(inert!.getAttribute("data-media-state")).toBe("inert");
    expect(secondRender.container.querySelector("img")).toBeNull();
  });

  it("supplies the rich-text host function only with a source registered", async () => {
    unregisterMediaSource();
    expect(createRichTextImageRequest()).toBeNull();

    registerMediaSource(stubSource({ pick: async () => [{ media_id: "img-1" }] }));
    const request = createRichTextImageRequest();
    expect(request).not.toBeNull();

    const input = await request!();
    expect(input).toEqual({
      src: "https://files.example/hero.jpg",
      alt: "",
      title: "Library title",
    });

    registerMediaSource(stubSource({ pick: async () => null }));
    expect(await createRichTextImageRequest()!()).toBeNull();

    registerMediaSource(stubSource({ pick: async () => [{ media_id: "unknown" }] }));
    expect(await createRichTextImageRequest()!()).toBeNull();
  });
});
