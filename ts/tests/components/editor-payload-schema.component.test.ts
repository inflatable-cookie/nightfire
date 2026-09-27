// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "../vitest";
import { fireEvent, render, waitFor, within } from "../render";

import BlockEditorHarness from "../fixtures/BlockEditorHarness.svelte";
import { proveEditorPayload } from "../helpers/editor-payload-proof";
import { CORE_BLOCK_TYPE_NAMES, type CoreBlockType } from "../../src/core-blocks";
import "../../src/editor-registrations";
import { getBlockEditor } from "../../src/editor-registry";
import {
  registerMediaSource,
  unregisterMediaSource,
} from "../../src/media-source";

const emptyRect = {
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON() {},
};
for (const proto of [Node.prototype, (globalThis as { Range?: { prototype: object } }).Range?.prototype].filter(Boolean)) {
  if (typeof (proto as { getClientRects?: unknown }).getClientRects !== "function") {
    (proto as { getClientRects: () => unknown[] }).getClientRects = () => [];
  }
  if (typeof (proto as { getBoundingClientRect?: unknown }).getBoundingClientRect !== "function") {
    (proto as { getBoundingClientRect: () => typeof emptyRect }).getBoundingClientRect = () => emptyRect;
  }
}

afterEach(() => {
  unregisterMediaSource();
});

function emptyBlock(type: string) {
  return { type, version: "initial", data: {} };
}

function storedBlock(view: { container: HTMLElement }) {
  const node = view.container.querySelector("[data-testid='stored-block']");
  if (!node?.textContent) throw new Error("stored block is missing");
  return JSON.parse(node.textContent) as { type: string; data: unknown };
}

function mountEditor(type: string, editorProps: Record<string, unknown> = {}) {
  const Editor = getBlockEditor(undefined, type);
  expect(Editor, type).toBeTruthy();
  return render(BlockEditorHarness, {
    Editor,
    initialBlock: emptyBlock(type),
    editorProps,
  });
}

function stubMedia(mediaId: string) {
  registerMediaSource({
    pick: async () => [{ media_id: mediaId }],
    resolve: () => ({
      url: "https://files.example/hero.jpg",
      filename: "hero.jpg",
      width: 1600,
      height: 900,
      title: "Library title",
      size: 1024,
    }),
  });
}

async function authorMarkdown(): Promise<unknown> {
  const view = mountEditor("markdown");
  const textarea = await waitFor(() => view.container.querySelector("textarea"));
  await fireEvent.input(textarea as HTMLTextAreaElement, { target: { value: "Hello" } });
  await waitFor(() => expect((storedBlock(view).data as { text?: string }).text).toBe("Hello"));
  return storedBlock(view).data;
}

async function authorRichText(): Promise<unknown> {
  const view = mountEditor("rich_text");
  const editable = await waitFor(() => {
    const node = view.container.querySelector('[contenteditable="true"]');
    expect(node).toBeTruthy();
    return node as HTMLElement;
  });
  editable.focus();
  editable.textContent = "Hello";
  await fireEvent.input(editable, { inputType: "insertText", data: "Hello" });
  await waitFor(() => {
    const data = storedBlock(view).data as { document?: { type?: string } };
    expect(data.document?.type).toBe("doc");
    expect(JSON.stringify(data.document)).toContain("Hello");
  });
  return storedBlock(view).data;
}

async function authorDownloadCard(): Promise<unknown> {
  stubMedia("media-1");
  const view = mountEditor("download_card");
  await fireEvent.click(
    await waitFor(() => within(view.container).getByRole("button", { name: /choose files/i })),
  );
  await waitFor(() => expect((storedBlock(view).data as { files?: unknown[] }).files).toHaveLength(1));

  await fireEvent.input(
    view.container.querySelector('input[placeholder="Card description (optional)"]')!,
    { target: { value: "Files" } },
  );
  await fireEvent.input(
    view.container.querySelector('input[placeholder="File title (optional)"]')!,
    { target: { value: "Source sheet" } },
  );
  await fireEvent.input(
    view.container.querySelector('input[placeholder="File description (optional)"]')!,
    { target: { value: "Source" } },
  );
  await waitFor(() => {
    const data = storedBlock(view).data as {
      description?: string;
      files?: Array<{ media_id?: string; title?: string; description?: string }>;
    };
    expect(data.description).toBe("Files");
    expect(data.files?.[0]).toMatchObject({
      media_id: "media-1",
      title: "Source sheet",
      description: "Source",
    });
  });
  return storedBlock(view).data;
}

async function authorTable(): Promise<unknown> {
  const view = mountEditor("table");
  await fireEvent.input(
    view.container.querySelector('input[placeholder="Table caption (optional)"]')!,
    { target: { value: "Totals" } },
  );

  const first = await waitFor(() =>
    within(view.container).getByRole("columnheader", { name: "Row 1, column 1" }),
  );
  first.focus();
  await fireEvent.keyDown(first, { key: "ArrowRight", shiftKey: true });
  await fireEvent.keyDown(document.activeElement as HTMLElement, {
    key: "ArrowDown",
    shiftKey: true,
  });
  await fireEvent.keyDown(document.activeElement as HTMLElement, {
    key: "M",
    ctrlKey: true,
    shiftKey: true,
  });

  const merged = await waitFor(() =>
    within(view.container).getByRole("columnheader", { name: "Row 1, column 1" }),
  );
  merged.focus();
  await fireEvent.keyDown(merged, { key: "4" });
  const input = within(view.container).getByRole("textbox", {
    name: "Edit Row 1, column 1",
  }) as HTMLTextAreaElement;
  await fireEvent.input(input, { target: { value: "42" } });
  await fireEvent.keyDown(input, { key: "Escape" });

  await fireEvent.change(within(view.container).getByLabelText("Horizontal alignment"), {
    target: { value: "right" },
  });
  await fireEvent.change(within(view.container).getByLabelText("Vertical alignment"), {
    target: { value: "middle" },
  });
  for (const edge of ["Top edge", "Bottom edge", "Left edge", "Right edge"]) {
    await fireEvent.click(within(view.container).getByRole("button", { name: edge }));
  }

  await waitFor(() => {
    const data = storedBlock(view).data as {
      caption?: string;
      rows?: Array<{ cells?: Array<Record<string, unknown>> }>;
    };
    expect(data.caption).toBe("Totals");
    expect(data.rows?.[0]?.cells?.[0]).toMatchObject({
      markdown: "42",
      is_header: true,
      colspan: 2,
      rowspan: 2,
      horizontal_align: "right",
      vertical_align: "middle",
      borders: { top: true, bottom: true, left: true, right: true },
    });
  });
  return storedBlock(view).data;
}

async function authorItemList(): Promise<unknown> {
  const view = mountEditor("item_list", { value: { schema: "example:content/list" } });
  await fireEvent.input(within(view.container).getByRole("textbox", { name: "Item list title (optional)" }), {
    target: { value: "Steps" },
  });
  await fireEvent.click(within(view.container).getByRole("button", { name: "Add item" }));
  await fireEvent.input(within(view.container).getByRole("textbox", { name: "Item 1 title (optional)" }), {
    target: { value: "First" },
  });
  await fireEvent.click(within(view.container).getByRole("button", { name: "Add child block to item 1" }));
  const markdown = await waitFor(() => within(view.container).getByPlaceholderText("Write markdown..."));
  await fireEvent.input(markdown, { target: { value: "Start" } });
  await waitFor(() => {
    const data = storedBlock(view).data as {
      title?: string;
      items?: Array<{ title?: string; body?: Array<{ data?: { text?: string } }> }>;
    };
    expect(data.title).toBe("Steps");
    expect(data.items?.[0]?.title).toBe("First");
    expect(data.items?.[0]?.body?.[0]?.data?.text).toBe("Start");
  });
  return storedBlock(view).data;
}

async function authorImage(): Promise<unknown> {
  stubMedia("media-1");
  const view = mountEditor("image");
  await fireEvent.click(
    await waitFor(() => within(view.container).getByRole("button", { name: /choose image/i })),
  );
  await waitFor(() => expect((storedBlock(view).data as { media_id?: string }).media_id).toBe("media-1"));

  await fireEvent.input(view.container.querySelector('input[placeholder="Alt text"]')!, {
    target: { value: "Example" },
  });
  await fireEvent.input(view.container.querySelector('input[placeholder="Title (optional)"]')!, {
    target: { value: "Author title" },
  });
  await fireEvent.input(view.container.querySelector('input[placeholder="Caption (optional)"]')!, {
    target: { value: "Seen from the ridge" },
  });
  await fireEvent.change(within(view.container).getByLabelText("Image size"), {
    target: { value: "large" },
  });
  await waitFor(() => {
    const data = storedBlock(view).data as {
      media_id?: string;
      alt?: string;
      title?: string;
      caption?: string;
      sizing?: string;
    };
    expect(data.media_id).toBe("media-1");
    expect(data.alt).toBe("Example");
    expect(data.title).toBe("Author title");
    expect(data.caption).toBe("Seen from the ridge");
    expect(data.sizing).toBe("large");
  });
  return storedBlock(view).data;
}

async function authorVideo(): Promise<unknown> {
  const view = mountEditor("video", { parseDebounce: 0 });
  const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  await fireEvent.input(within(view.container).getByPlaceholderText("Paste a URL or embed code..."), {
    target: { value: url },
  });
  await waitFor(() => {
    const data = storedBlock(view).data as { embed?: { provider?: string; id?: string } };
    expect(data.embed?.provider).toBe("youtube");
    expect(data.embed?.id).toBe("dQw4w9WgXcQ");
  });
  await fireEvent.input(
    view.container.querySelector('input[placeholder="Title (optional, used as the embed\'s accessible name)"]')!,
    { target: { value: "Example film" } },
  );
  await fireEvent.input(view.container.querySelector('input[placeholder="Caption (optional)"]')!, {
    target: { value: "Seen from the ridge" },
  });
  await waitFor(() => {
    const data = storedBlock(view).data as { title?: string; caption?: string };
    expect(data.title).toBe("Example film");
    expect(data.caption).toBe("Seen from the ridge");
  });
  return storedBlock(view).data;
}

const authors: Record<CoreBlockType, () => Promise<unknown>> = {
  markdown: authorMarkdown,
  rich_text: authorRichText,
  download_card: authorDownloadCard,
  table: authorTable,
  item_list: authorItemList,
  image: authorImage,
  video: authorVideo,
};

describe("editor stored payloads against published schemas", () => {
  for (const type of CORE_BLOCK_TYPE_NAMES) {
    it(`authors ${type} and validates the stored data`, async () => {
      const author = authors[type];
      if (!author) throw new Error(`no editor authoring path for ${type}`);
      const data = await author();
      await proveEditorPayload(type, data);
    });
  }
});
