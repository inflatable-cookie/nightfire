// @vitest-environment jsdom
import { describe, expect, it } from "../vitest";
import { fireEvent, render, waitFor, within } from "../render";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import "../../src/render-registrations";
import "../../src/editor-registrations";
import { getBlockRenderer } from "../../src/render-registry";
import { getBlockEditor, isBlockContentEmpty } from "../../src/editor-registry";

const RendererComponent = getBlockRenderer(undefined, "video");
const EditorComponent = getBlockEditor(undefined, "video");

const YOUTUBE_ID = "dQw4w9WgXcQ";
const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_ID}`;

const titledBlock = {
  type: "video",
  version: "initial",
  data: {
    embed: { provider: "youtube", id: YOUTUBE_ID, originalUrl: YOUTUBE_URL },
    title: "Example film",
    caption: "Seen from the ridge",
  },
};

function urlInput(container: HTMLElement): HTMLTextAreaElement {
  const field = within(container).getByPlaceholderText(
    "Paste a URL or embed code..."
  ) as HTMLTextAreaElement;
  return field;
}

describe("nightfire/video block", () => {
  it("registers both parts", () => {
    expect(RendererComponent).toBeTruthy();
    expect(EditorComponent).toBeTruthy();
  });

  it("answers emptiness from the embed address alone", () => {
    expect(isBlockContentEmpty({ type: "video", data: {} })).toBe(true);
    expect(
      isBlockContentEmpty({ type: "video", data: { title: "x", caption: "y" } })
    ).toBe(true);
    expect(
      isBlockContentEmpty({ type: "video", data: { embed: { provider: "", id: "" } } })
    ).toBe(true);
    expect(
      isBlockContentEmpty({ type: "video", data: { embed: { provider: "youtube" } } })
    ).toBe(true);
    expect(
      isBlockContentEmpty({
        type: "video",
        data: { embed: { provider: "youtube", id: YOUTUBE_ID } },
      })
    ).toBe(false);
  });

  it("renders the embed with the title as its accessible name and no styling", () => {
    const view = render(RendererComponent as any, { block: titledBlock });
    const root = view.container.querySelector('[data-nightfire-block="video"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("class")).toBeNull();
    expect(root!.getAttribute("style")).toBeNull();
    expect(root!.getAttribute("data-embed-state")).toBe("ready");

    const frame = view.container.querySelector("iframe") as HTMLIFrameElement;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute("src")).toBe(`https://www.youtube.com/embed/${YOUTUBE_ID}`);
    expect(frame.getAttribute("title")).toBe("Example film");
    expect(frame.getAttribute("style")).toBeNull();

    expect(view.container.querySelector("[data-video-caption]")!.textContent).toBe(
      "Seen from the ridge"
    );
  });

  it("renders nothing with no addressable embed", () => {
    for (const data of [
      {},
      { title: "x" },
      { embed: null },
      { embed: { provider: "", id: "" } },
      { embed: { provider: "youtube" } },
    ]) {
      const view = render(RendererComponent as any, {
        block: { type: "video", version: "initial", data },
      });
      expect(view.container.querySelector('[data-nightfire-block="video"]')).toBeNull();
    }
  });

  it("renders inert output when Poodle cannot render the embed", () => {
    // A generic provider with no pasted markup has no renderer: the block
    // stays marked and keeps the author's caption rather than vanishing.
    const view = render(RendererComponent as any, {
      block: {
        type: "video",
        version: "initial",
        data: {
          embed: { provider: "generic", id: "https://example.com/foo" },
          caption: "kept",
        },
      },
    });
    const root = view.container.querySelector('[data-nightfire-block="video"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("data-embed-state")).toBe("inert");
    expect(view.container.querySelector("iframe")).toBeNull();
    expect(view.container.querySelector("[data-video-caption]")!.textContent).toBe("kept");
  });

  it("sanitizes a hostile embed value and a hostile title", () => {
    const view = render(RendererComponent as any, {
      block: {
        type: "video",
        version: "initial",
        data: {
          embed: {
            provider: "generic",
            id: "hostile",
            originalEmbed: `<iframe src="https://www.youtube.com/embed/${YOUTUBE_ID}" onload="evil()" width="560"></iframe><script>evil()</script>`,
          },
          title: `"><script>evil()</script>`,
          caption: "kept",
        },
      },
    });
    const root = view.container.querySelector('[data-nightfire-block="video"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("data-embed-state")).toBe("ready");

    expect(view.container.querySelector("script")).toBeNull();
    expect(view.container.innerHTML.toLowerCase()).not.toContain("onload");
    expect(view.container.innerHTML.toLowerCase()).not.toContain("evil()");

    const frame = view.container.querySelector("iframe") as HTMLIFrameElement;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute("src")).toBe(`https://www.youtube.com/embed/${YOUTUBE_ID}`);
    // A hostile title never reaches the frame as markup: the sanitizer drops
    // the attribute rather than carrying attacker content. (A benign title is
    // asserted as the accessible name in the render test above.)
    const hostileTitle = frame.getAttribute("title");
    expect(hostileTitle === null || !hostileTitle.includes("<")).toBe(true);
  });

  it("keeps the embed model in Poodle: no provider list, parser or shape under ts/src", () => {
    const dir = join(import.meta.dir, "../../src/video");
    const sources = readdirSync(dir)
      .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".svelte"))
      .map((entry) => readFileSync(join(dir, entry), "utf8"));
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      // No provider is ever named here; the admitted set is Poodle's.
      expect(source).not.toMatch(/youtube|vimeo|audioboom/i);
      // No parsing machinery here either; `EmbedInput` owns it.
      expect(source).not.toMatch(/new RegExp|RegExp\(|\.match\(|\.exec\(|detectParsedEmbed/);
    }
    const combined = sources.join("\n");
    // The only embed names here are Poodle's imports and the stored shape's fields.
    expect(combined).toContain("@inflatable-cookie/poodle-svelte");
    expect(combined).toContain("renderEmbed");
    expect(combined).toContain("EmbedInput");
  });

  it("pastes a supported URL, shows the provider, and stores the parsed embed", async () => {
    const onChange = (...args: unknown[]) => {
      calls.push(args[0]);
    };
    const calls: unknown[] = [];
    const view = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange,
      parseDebounce: 0,
    });

    await fireEvent.input(urlInput(view.container), { target: { value: YOUTUBE_URL } });

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const saved = calls.at(-1) as any;
    expect(saved.type).toBe("video");
    expect(saved.data.embed.provider).toBe("youtube");
    expect(saved.data.embed.id).toBe(YOUTUBE_ID);
    expect(saved.data.embed.originalUrl).toBe(YOUTUBE_URL);

    // The author sees the parsed provider before saving.
    await waitFor(() =>
      expect(view.container.textContent).toContain("Embed detected")
    );
    expect(view.container.textContent).toContain("youtube");
  });

  it("survives the scenario oracle: paste, title, save, reload", async () => {
    const calls: unknown[] = [];
    const editorView = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange: (...args: unknown[]) => {
        calls.push(args[0]);
      },
      parseDebounce: 0,
    });

    await fireEvent.input(urlInput(editorView.container), {
      target: { value: YOUTUBE_URL },
    });
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));

    const saved = {
      ...(calls.at(-1) as any),
      data: {
        ...((calls.at(-1) as any).data as object),
        title: "Example film",
        caption: "Seen from the ridge",
      },
    };

    const firstRender = render(RendererComponent as any, { block: saved });
    const frame = firstRender.container.querySelector(
      '[data-nightfire-block="video"] iframe'
    ) as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe(`https://www.youtube.com/embed/${YOUTUBE_ID}`);
    expect(frame.getAttribute("title")).toBe("Example film");

    // Reloading the editor starts from the stored embed's own URL.
    const reloaded = render(EditorComponent as any, {
      block: saved,
      onChange: () => {},
      parseDebounce: 0,
    });
    expect((urlInput(reloaded.container) as HTMLTextAreaElement).value).toBe(YOUTUBE_URL);
  });

  it("refuses a disallowed provider and stores nothing", async () => {
    const calls: unknown[] = [];
    const view = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange: (...args: unknown[]) => {
        calls.push(args[0]);
      },
      providers: ["youtube"],
      parseDebounce: 0,
    });

    await fireEvent.input(urlInput(view.container), {
      target: { value: "https://vimeo.com/123456" },
    });

    await waitFor(() =>
      expect(view.container.textContent).toContain('Provider "vimeo" is not allowed')
    );
    expect(calls.length).toBe(0);
  });

  it("refuses an unparseable value and leaves the block unchanged", async () => {
    const calls: unknown[] = [];
    const view = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange: (...args: unknown[]) => {
        calls.push(args[0]);
      },
      parseDebounce: 0,
    });

    await fireEvent.input(urlInput(view.container), { target: { value: "not a url" } });

    await waitFor(() =>
      expect(view.container.textContent).toContain("Could not parse embed source")
    );
    expect(calls.length).toBe(0);
  });

  it("drops the embed when the input is cleared and keeps title and caption", async () => {
    const calls: unknown[] = [];
    const view = render(EditorComponent as any, {
      block: titledBlock,
      onChange: (...args: unknown[]) => {
        calls.push(args[0]);
      },
      parseDebounce: 0,
    });

    await fireEvent.input(urlInput(view.container), { target: { value: "" } });

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const cleared = calls.at(-1) as any;
    expect(cleared.data.embed).toBeUndefined();
    expect(cleared.data.title).toBe("Example film");
    expect(cleared.data.caption).toBe("Seen from the ridge");
  });

  it("edits title and caption without losing the embed", async () => {
    const calls: unknown[] = [];
    const view = render(EditorComponent as any, {
      block: titledBlock,
      onChange: (...args: unknown[]) => {
        calls.push(args[0]);
      },
      parseDebounce: 0,
    });

    const captionInput = within(view.container).getByPlaceholderText(
      "Caption (optional)"
    ) as HTMLInputElement;
    await fireEvent.input(captionInput, { target: { value: "A new caption" } });

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const next = calls.at(-1) as any;
    expect(next.data.embed).toEqual(titledBlock.data.embed);
    expect(next.data.title).toBe("Example film");
    expect(next.data.caption).toBe("A new caption");
  });
});
