import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "../render";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { flushSync } from "svelte";
import VideoEditorHarness from "./VideoEditorHarness.svelte";

import "../../src/render-registrations";
import "../../src/editor-registrations";
import { getBlockRenderer } from "../../src/render-registry";
import { getBlockEditor, isBlockContentEmpty } from "../../src/editor-registry";

const RendererComponent = getBlockRenderer(undefined, "video");
const EditorComponent = getBlockEditor(undefined, "video");

// The parent in these cases persists and reloads the payload, so the clone is
// the JSON wire round-trip the block must survive on its own. structuredClone
// refuses the Svelte state proxy the payload carries here.
function cloneThroughWire<T>(value: T): T {
  // oxlint-disable-next-line unicorn/prefer-structured-clone -- the wire round-trip is the point of the case
  return JSON.parse(JSON.stringify(value)) as T;
}

const YOUTUBE_ID = "dQw4w9WgXcQ";
const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_ID}`;

const titledBlock = {
  type: "video",
  version: "initial",
  data: {
    embed: { provider: "youtube", id: YOUTUBE_ID, originalUrl: YOUTUBE_URL },
    title: "Example film",
    caption: "Seen from the ridge"
  }
};

function urlInput(container: HTMLElement): HTMLTextAreaElement {
  return within(container).getByPlaceholderText<HTMLTextAreaElement>(
    "Paste a URL or embed code..."
  );
}

describe("nightfire/video block", () => {
  it("registers both parts", () => {
    expect(RendererComponent).toBeTruthy();
    expect(EditorComponent).toBeTruthy();
  });

  it("answers emptiness from the embed address alone", () => {
    expect(isBlockContentEmpty({ type: "video", data: {} })).toBe(true);
    expect(isBlockContentEmpty({ type: "video", data: { title: "x", caption: "y" } })).toBe(true);
    expect(isBlockContentEmpty({ type: "video", data: { embed: { provider: "", id: "" } } })).toBe(
      true
    );
    expect(isBlockContentEmpty({ type: "video", data: { embed: { provider: "youtube" } } })).toBe(
      true
    );
    expect(
      isBlockContentEmpty({
        type: "video",
        data: { embed: { provider: "youtube", id: YOUTUBE_ID } }
      })
    ).toBe(false);
  });

  it("matches the committed video fixture HTML", () => {
    const fixture = JSON.parse(readFileSync("fixtures/wire/v1/nightfire-values.json", "utf8")) as {
      values: Array<{ name: string; value: { blocks: Array<{ type: string }> } }>;
    };
    const block = fixture.values
      .find((entry) => entry.name === "core-payloads")!
      .value.blocks.find((entry) => entry.type === "video");
    const view = render(RendererComponent as any, { block });
    const root = view.container.querySelector('[data-nightfire-block="video"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute("data-embed-state")).toBe("ready");
    const frame = root.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(frame.getAttribute("title")).toBe("Example film");
    expect(root.querySelector("[data-video-caption]")!.textContent).toBe("Seen from the ridge");
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
      { embed: { provider: "youtube" } }
    ]) {
      const view = render(RendererComponent as any, {
        block: { type: "video", version: "initial", data }
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
          caption: "kept"
        }
      }
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
            originalEmbed: `<iframe src="https://www.youtube.com/embed/${YOUTUBE_ID}" onload="evil()" width="560"></iframe><script>evil()</script>`
          },
          title: `"><script>evil()</script>`,
          caption: "kept"
        }
      }
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

  it("keeps URL parsing in the editor and the provider allow-list in renderEmbed", () => {
    const dir = join(import.meta.dir, "../../src/video");
    const sources = Object.fromEntries(
      readdirSync(dir)
        .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".svelte"))
        .map((entry) => [entry, readFileSync(join(dir, entry), "utf8")])
    );
    expect(Object.keys(sources).length).toBeGreaterThan(0);
    for (const [name, source] of Object.entries(sources)) {
      // URL parsing stays in Poodle's EmbedInput; Nightfire does not host a parser.
      expect(source, name).not.toMatch(/new RegExp|RegExp\(|detectParsedEmbed/);
    }
    expect(sources["VideoEditor.svelte"]).toContain("@inflatable-cookie/poodle-svelte");
    expect(sources["VideoEditor.svelte"]).toContain("EmbedInput");
    expect(sources["VideoRenderer.svelte"]).not.toContain("@inflatable-cookie/poodle-svelte");
    expect(sources["render-embed.ts"]).toContain("renderEmbed");
    expect(sources["render-embed.ts"]).toMatch(/youtube|vimeo|audioboom/);
  });

  it("pastes a supported URL, shows the provider, and stores the parsed embed", async () => {
    const onChange = (...args: Array<unknown>) => {
      calls.push(args[0]);
    };
    const calls: Array<unknown> = [];
    const view = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange,
      parseDebounce: 0
    });

    await fireEvent.input(urlInput(view.container), { target: { value: YOUTUBE_URL } });

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const saved = calls.at(-1) as any;
    expect(saved.type).toBe("video");
    expect(saved.data.embed.provider).toBe("youtube");
    expect(saved.data.embed.id).toBe(YOUTUBE_ID);
    expect(saved.data.embed.originalUrl).toBe(YOUTUBE_URL);

    // The author sees the parsed provider before saving.
    await waitFor(() => expect(view.container.textContent).toContain("Embed detected"));
    expect(view.container.textContent).toContain("youtube");
  });

  it("keeps the id and does not restore a cleared embed when editing the title", async () => {
    const calls: Array<any> = [];
    const view = render(EditorComponent as any, {
      block: { ...titledBlock, id: "video-1" },
      onChange: (next: unknown) => calls.push(next),
      parseDebounce: 0
    });
    await fireEvent.input(urlInput(view.container), { target: { value: "" } });
    const title = within(view.container).getByPlaceholderText(
      "Title (optional, used as the embed's accessible name)"
    );
    await fireEvent.input(title, { target: { value: "Changed" } });
    expect(calls.at(-1).id).toBe("video-1");
    expect(calls.at(-1).data.embed).toBeUndefined();
  });

  it("updates the input and subsequent edits when the parent replaces the embed", async () => {
    const calls: Array<any> = [];
    const view = render(VideoEditorHarness, {
      initial: { type: "video", data: {} },
      onChange: (next: unknown) => calls.push(next)
    });
    await fireEvent.input(urlInput(view.container), { target: { value: YOUTUBE_URL } });
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const external = { provider: "vimeo", id: "12345", originalUrl: "https://vimeo.com/12345" };
    (view.component as { setBlock: (next: unknown) => void }).setBlock({
      type: "video",
      data: { embed: external }
    });
    flushSync();
    expect(urlInput(view.container).value).toBe(external.originalUrl);
    await fireEvent.input(within(view.container).getByPlaceholderText("Caption (optional)"), {
      target: { value: "New" }
    });
    expect(calls.at(-1).data.embed).toEqual(external);
  });

  it("keeps the input when a parent clones the emitted block in onChange", async () => {
    const calls: Array<any> = [];
    const view = render(VideoEditorHarness, {
      initial: { type: "video", data: {} },
      onChange: (next: unknown) => {
        calls.push(next);
        (view.component as { setBlock: (next: unknown) => void }).setBlock(cloneThroughWire(next));
      }
    });

    const iframeMarkup = `<iframe src="https://www.youtube.com/embed/${YOUTUBE_ID}"></iframe>`;
    await fireEvent.input(urlInput(view.container), { target: { value: iframeMarkup } });
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    flushSync();

    expect(calls.at(-1).data.embed.provider).toBe("youtube");
    expect(urlInput(view.container).value).toBe(iframeMarkup);

    await fireEvent.input(urlInput(view.container), { target: { value: "not a url" } });
    await waitFor(() =>
      expect(view.container.textContent).toContain("Could not parse embed source")
    );
    (view.component as { setBlock: (next: unknown) => void }).setBlock(
      cloneThroughWire(calls.at(-1))
    );
    flushSync();
    expect(urlInput(view.container).value).toBe("not a url");
  });

  it("survives the scenario oracle: paste, title, save, reload", async () => {
    const calls: Array<unknown> = [];
    const editorView = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange: (...args: Array<unknown>) => {
        calls.push(args[0]);
      },
      parseDebounce: 0
    });

    await fireEvent.input(urlInput(editorView.container), {
      target: { value: YOUTUBE_URL }
    });
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));

    const saved = {
      ...(calls.at(-1) as any),
      data: {
        ...((calls.at(-1) as any).data as object),
        title: "Example film",
        caption: "Seen from the ridge"
      }
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
      parseDebounce: 0
    });
    expect(urlInput(reloaded.container).value).toBe(YOUTUBE_URL);
  });

  it("refuses a disallowed provider and stores nothing", async () => {
    const calls: Array<unknown> = [];
    const view = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange: (...args: Array<unknown>) => {
        calls.push(args[0]);
      },
      providers: ["youtube"],
      parseDebounce: 0
    });

    await fireEvent.input(urlInput(view.container), {
      target: { value: "https://vimeo.com/123456" }
    });

    await waitFor(() =>
      expect(view.container.textContent).toContain('Provider "vimeo" is not allowed')
    );
    expect(calls.length).toBe(0);
  });

  it("refuses an unparseable value and leaves the block unchanged", async () => {
    const calls: Array<unknown> = [];
    const view = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange: (...args: Array<unknown>) => {
        calls.push(args[0]);
      },
      parseDebounce: 0
    });

    await fireEvent.input(urlInput(view.container), { target: { value: "not a url" } });

    await waitFor(() =>
      expect(view.container.textContent).toContain("Could not parse embed source")
    );
    expect(calls.length).toBe(0);
  });

  it("does not emit a prior pending embed on title or caption edits after a parse error", async () => {
    const calls: Array<any> = [];
    const view = render(EditorComponent as any, {
      block: { type: "video", version: "initial", data: {} },
      onChange: (next: unknown) => calls.push(next),
      parseDebounce: 0
    });

    await fireEvent.input(urlInput(view.container), { target: { value: YOUTUBE_URL } });
    await waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0].data.embed.id).toBe(YOUTUBE_ID);

    await fireEvent.input(urlInput(view.container), { target: { value: "not a url" } });
    await waitFor(() =>
      expect(view.container.textContent).toContain("Could not parse embed source")
    );
    expect(calls.length).toBe(1);

    await fireEvent.input(
      within(view.container).getByPlaceholderText(
        "Title (optional, used as the embed's accessible name)"
      ),
      { target: { value: "Updated title" } }
    );
    expect(calls.at(-1).data.embed).toBeUndefined();
    expect(calls.at(-1).data.title).toBe("Updated title");

    await fireEvent.input(within(view.container).getByPlaceholderText("Caption (optional)"), {
      target: { value: "Updated caption" }
    });
    expect(calls.at(-1).data.embed).toBeUndefined();
    expect(calls.at(-1).data.caption).toBe("Updated caption");
  });

  it("drops the embed when the input is cleared and keeps title and caption", async () => {
    const calls: Array<unknown> = [];
    const view = render(EditorComponent as any, {
      block: titledBlock,
      onChange: (...args: Array<unknown>) => {
        calls.push(args[0]);
      },
      parseDebounce: 0
    });

    await fireEvent.input(urlInput(view.container), { target: { value: "" } });

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const cleared = calls.at(-1) as any;
    expect(cleared.data.embed).toBeUndefined();
    expect(cleared.data.title).toBe("Example film");
    expect(cleared.data.caption).toBe("Seen from the ridge");
  });

  it("edits title and caption without losing the embed", async () => {
    const calls: Array<unknown> = [];
    const view = render(EditorComponent as any, {
      block: titledBlock,
      onChange: (...args: Array<unknown>) => {
        calls.push(args[0]);
      },
      parseDebounce: 0
    });

    const captionInput = within(view.container).getByPlaceholderText<HTMLInputElement>(
      "Caption (optional)"
    );
    await fireEvent.input(captionInput, { target: { value: "A new caption" } });

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const next = calls.at(-1) as any;
    expect(next.data.embed).toEqual(titledBlock.data.embed);
    expect(next.data.title).toBe("Example film");
    expect(next.data.caption).toBe("A new caption");
  });

  it("reloads originalEmbed when originalUrl is absent on mount and external updates", () => {
    const iframeMarkup = `<iframe src="https://www.youtube.com/embed/${YOUTUBE_ID}"></iframe>`;
    const reloaded = render(EditorComponent as any, {
      block: {
        type: "video",
        version: "initial",
        data: {
          embed: {
            provider: "youtube",
            id: YOUTUBE_ID,
            originalEmbed: iframeMarkup
          }
        }
      },
      onChange: () => {},
      parseDebounce: 0
    });
    expect(urlInput(reloaded.container).value).toBe(iframeMarkup);

    const updatedEmbed = {
      provider: "vimeo",
      id: "98765",
      originalEmbed: '<iframe src="https://player.vimeo.com/video/98765"></iframe>'
    };
    const harnessView = render(VideoEditorHarness, {
      initial: { type: "video", data: {} },
      onChange: () => {}
    });
    (harnessView.component as { setBlock: (next: unknown) => void }).setBlock({
      type: "video",
      data: { embed: updatedEmbed }
    });
    flushSync();
    expect(urlInput(harnessView.container).value).toBe(updatedEmbed.originalEmbed);
  });
});
