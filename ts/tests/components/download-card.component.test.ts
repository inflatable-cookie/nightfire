// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "../vitest";
import { fireEvent, render, waitFor, within } from "../render";

import "../../src/render-registrations";
import "../../src/editor-registrations";
import { getBlockRenderer } from "../../src/render-registry";
import { getBlockEditor, isBlockContentEmpty } from "../../src/editor-registry";
import {
  registerMediaSource,
  unregisterMediaSource,
  type MediaSource,
} from "../../src/media-source";

const RendererComponent = getBlockRenderer(undefined, "download_card");
const EditorComponent = getBlockEditor(undefined, "download_card");

const resolvedByRef: Record<string, { url: string; filename: string; size?: number; mime?: string }> = {
  "m-1": {
    url: "https://files.example/trail-map.pdf",
    filename: "trail-map.pdf",
    size: 2 * 1024 * 1024,
    mime: "application/pdf",
  },
  "m-2": {
    url: "https://files.example/checklist.docx",
    filename: "checklist.docx",
  },
};

function stubSource(overrides: Partial<MediaSource> = {}): MediaSource {
  return {
    pick: async () => null,
    resolve: (reference) => resolvedByRef[reference.media_id] ?? null,
    ...overrides,
  };
}

const twoFileBlock = {
  type: "download_card",
  version: "initial",
  data: {
    description: "Field guides",
    files: [
      { media_id: "m-1", title: "Trail map", description: "Print before the walk" },
      { media_id: "m-2" },
    ],
  },
};

afterEach(() => {
  unregisterMediaSource();
});

describe("nightfire/download-card block", () => {
  it("registers both parts", () => {
    expect(RendererComponent).toBeTruthy();
    expect(EditorComponent).toBeTruthy();
  });

  it("answers emptiness from the file references alone", () => {
    expect(isBlockContentEmpty({ type: "download_card", data: {} })).toBe(true);
    expect(isBlockContentEmpty({ type: "download_card", data: { description: "x", files: [] } })).toBe(true);
    expect(isBlockContentEmpty({ type: "download_card", data: { files: [{ media_id: "  " }] } })).toBe(true);
    expect(isBlockContentEmpty({ type: "download_card", data: { files: [{ media_id: "m-1" }] } })).toBe(false);
  });

  it("renders resolved rows through the registered media source", () => {
    registerMediaSource(stubSource());

    const view = render(RendererComponent as any, { block: twoFileBlock });
    const root = view.container.querySelector('[data-nightfire-block="download_card"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute("class")).toBeNull();

    expect(view.container.querySelector("[data-download-card-description]")!.textContent).toBe(
      "Field guides"
    );

    const rows = view.container.querySelectorAll("[data-download-card-file]");
    expect(rows).toHaveLength(2);

    const first = rows[0] as HTMLElement;
    expect(first.getAttribute("data-media-state")).toBe("resolved");
    // The title is the row's first element, ahead of the filename link.
    const title = first.querySelector("[data-download-card-file-title]");
    expect(title!.textContent).toBe("Trail map");
    expect(first.firstElementChild).toBe(title);
    const link = first.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://files.example/trail-map.pdf");
    expect(link.getAttribute("download")).toBe("trail-map.pdf");
    expect(link.textContent).toBe("trail-map.pdf");
    expect(first.querySelector("[data-download-card-file-type]")!.textContent).toBe("application/pdf");
    expect(first.querySelector("[data-download-card-file-size]")!.textContent).toBe("2 MB");
    expect(first.querySelector("[data-download-card-file-description]")!.textContent).toBe(
      "Print before the walk"
    );

    const second = rows[1] as HTMLElement;
    expect(second.getAttribute("data-media-state")).toBe("resolved");
    // An untitled row carries no title element but is still labelled by its
    // resolved filename.
    expect(second.querySelector("[data-download-card-file-title]")).toBeNull();
    expect(second.querySelector("a")!.textContent).toBe("checklist.docx");
    expect(second.querySelector("[data-download-card-file-size]")).toBeNull();
    expect(second.querySelector("[data-download-card-file-description]")).toBeNull();
  });

  it("renders rows inert and keeps the author's text with no source registered", () => {
    unregisterMediaSource();

    const view = render(RendererComponent as any, { block: twoFileBlock });
    const root = view.container.querySelector('[data-nightfire-block="download_card"]');
    expect(root).toBeTruthy();

    expect(view.container.querySelector("[data-download-card-description]")!.textContent).toBe(
      "Field guides"
    );

    const rows = view.container.querySelectorAll("[data-download-card-file]");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.getAttribute("data-media-state")).toBe("inert");
      expect(row.querySelector("a")).toBeNull();
    }
    expect(view.container.querySelector("[data-download-card-file-title]")!.textContent).toBe(
      "Trail map"
    );
    expect(view.container.querySelector("[data-download-card-file-description]")!.textContent).toBe(
      "Print before the walk"
    );
  });

  it("marks only the unresolved row inert when the source does not know a reference", () => {
    registerMediaSource({
      pick: async () => null,
      resolve: (reference) =>
        reference.media_id === "m-1" ? resolvedByRef["m-1"]! : null,
    });

    const view = render(RendererComponent as any, { block: twoFileBlock });
    const rows = view.container.querySelectorAll("[data-download-card-file]");
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute("data-media-state")).toBe("resolved");
    expect(rows[1].getAttribute("data-media-state")).toBe("inert");
    expect(view.container.querySelectorAll("a")).toHaveLength(1);
  });

  it("renders nothing when no file entry carries a reference", () => {
    registerMediaSource(stubSource());

    for (const data of [
      { description: "x", files: [] },
      {},
      { files: [{ description: "no ref" }] },
      { files: [{ title: "no ref" }] },
    ]) {
      const view = render(RendererComponent as any, {
        block: { type: "download_card", version: "initial", data },
      });
      expect(view.container.querySelector('[data-nightfire-block="download_card"]')).toBeNull();
    }
  });

  it("round-trips a multi-file pick, a card description, and a file description", async () => {
    const pick = vi.fn(async () => [{ media_id: "m-1" }, { media_id: "m-2" }]);
    registerMediaSource(stubSource({ pick }));

    const onChange = vi.fn();
    const view = render(EditorComponent as any, {
      block: { type: "download_card", version: "initial", data: {} },
      onChange,
    });

    await fireEvent.click(
      await waitFor(() => within(view.container).getByRole("button", { name: /choose files/i }))
    );

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const afterPick = onChange.mock.calls.at(-1)![0];
    expect(afterPick.type).toBe("download_card");
    expect(afterPick.data.files).toEqual([{ media_id: "m-1" }, { media_id: "m-2" }]);

    // The editor is controlled: the parent feeds each emitted block back
    // before the next interaction, and the rows then show the resolved
    // filename, not just the raw reference.
    let editor = render(EditorComponent as any, { block: afterPick, onChange });
    expect(
      editor.container.querySelector(".underlay-download-card-editor__file-name")!.textContent
    ).toBe("trail-map.pdf");

    await fireEvent.input(
      editor.container.querySelector('input[placeholder="Card description (optional)"]')!,
      { target: { value: "Field guides" } }
    );
    await waitFor(() => expect(onChange.mock.calls.length).toBe(2));

    editor = render(EditorComponent as any, { block: onChange.mock.calls.at(-1)![0], onChange });
    const titleInput = editor.container.querySelector(
      'input[placeholder="File title (optional)"]'
    ) as HTMLInputElement;
    expect(titleInput).toBeTruthy();
    await fireEvent.input(titleInput, { target: { value: "Trail map" } });
    await waitFor(() => expect(onChange.mock.calls.length).toBe(3));

    editor = render(EditorComponent as any, { block: onChange.mock.calls.at(-1)![0], onChange });
    const fileInput = editor.container.querySelector(
      'input[placeholder="File description (optional)"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    await fireEvent.input(fileInput, { target: { value: "Print before the walk" } });
    await waitFor(() => expect(onChange.mock.calls.length).toBe(4));

    const last = onChange.mock.calls.at(-1)![0];
    expect(last.data).toEqual({
      description: "Field guides",
      files: [
        { media_id: "m-1", title: "Trail map", description: "Print before the walk" },
        { media_id: "m-2" },
      ],
    });
  });

  it("changes nothing when the picker is cancelled and skips duplicates", async () => {
    const pick = vi.fn(async () => [{ media_id: "m-1" }]);
    registerMediaSource(stubSource({ pick }));

    const onChange = vi.fn();
    const view = render(EditorComponent as any, {
      block: { type: "download_card", version: "initial", data: { files: [{ media_id: "m-1" }] } },
      onChange,
    });

    const pickButton = await waitFor(() =>
      within(view.container).getByRole("button", { name: /add files/i })
    );

    // Picking the file the card already holds adds nothing.
    await fireEvent.click(pickButton);
    await waitFor(() => expect(pick).toHaveBeenCalledTimes(1));
    expect(onChange).not.toHaveBeenCalled();

    // Cancelling the picker changes nothing.
    pick.mockResolvedValueOnce(null);
    await fireEvent.click(pickButton);
    await waitFor(() => expect(pick).toHaveBeenCalledTimes(2));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("survives the scenario oracle: pick, save, reload, then unregister", async () => {
    // 1. Pick two files, describe the card and one file.
    registerMediaSource(stubSource({ pick: async () => [{ media_id: "m-1" }, { media_id: "m-2" }] }));

    const onChange = vi.fn();
    let editorView = render(EditorComponent as any, {
      block: { type: "download_card", version: "initial", data: {} },
      onChange,
    });
    await fireEvent.click(
      await waitFor(() =>
        within(editorView.container).getByRole("button", { name: /choose files/i })
      )
    );
    await waitFor(() => expect(onChange).toHaveBeenCalled());

    // The parent feeds each emitted block back before the next interaction.
    editorView = render(EditorComponent as any, {
      block: onChange.mock.calls.at(-1)![0],
      onChange,
    });
    await fireEvent.input(
      editorView.container.querySelector('input[placeholder="Card description (optional)"]')!,
      { target: { value: "Field guides" } }
    );
    await waitFor(() => expect(onChange.mock.calls.length).toBe(2));

    editorView = render(EditorComponent as any, {
      block: onChange.mock.calls.at(-1)![0],
      onChange,
    });
    await fireEvent.input(
      editorView.container.querySelector('input[placeholder="File title (optional)"]')!,
      { target: { value: "Trail map" } }
    );
    await waitFor(() => expect(onChange.mock.calls.length).toBe(3));

    editorView = render(EditorComponent as any, {
      block: onChange.mock.calls.at(-1)![0],
      onChange,
    });
    await fireEvent.input(
      editorView.container.querySelector('input[placeholder="File description (optional)"]')!,
      { target: { value: "Print before the walk" } }
    );
    await waitFor(() => expect(onChange.mock.calls.length).toBe(4));

    // 2. Save: the last emitted payload is what the consumer stores.
    const saved = onChange.mock.calls.at(-1)![0];

    // 3. Reload: render the stored block from the same references. The row
    //    reads title, then filename, then description.
    const firstRender = render(RendererComponent as any, { block: saved });
    expect(
      firstRender.container.querySelector("[data-download-card-description]")!.textContent
    ).toBe("Field guides");
    const rows = firstRender.container.querySelectorAll("[data-download-card-file]");
    expect(rows).toHaveLength(2);
    const firstRow = rows[0] as HTMLElement;
    expect(firstRow.getAttribute("data-media-state")).toBe("resolved");
    const title = firstRow.querySelector("[data-download-card-file-title]");
    expect(title!.textContent).toBe("Trail map");
    expect(firstRow.firstElementChild).toBe(title);
    expect(firstRow.querySelector("a")!.textContent).toBe("trail-map.pdf");
    const rowDescription = firstRow.lastElementChild!;
    expect(rowDescription.getAttribute("data-download-card-file-description")).toBe("");
    expect(rowDescription.textContent).toBe("Print before the walk");

    // 4. The consumer stops providing a source: the same block renders inert,
    //    not broken, and the author's title and descriptions survive.
    unregisterMediaSource();
    const secondRender = render(RendererComponent as any, { block: saved });
    expect(
      secondRender.container.querySelector('[data-nightfire-block="download_card"]')
    ).toBeTruthy();
    for (const row of secondRender.container.querySelectorAll("[data-download-card-file]")) {
      expect(row.getAttribute("data-media-state")).toBe("inert");
    }
    expect(
      secondRender.container.querySelector("[data-download-card-description]")!.textContent
    ).toBe("Field guides");
    expect(
      secondRender.container.querySelector("[data-download-card-file-title]")!.textContent
    ).toBe("Trail map");

    // 5. Clear the title: the emitted block drops the key, and the filename
    //    still labels the row.
    const clearChange = vi.fn();
    const clearView = render(EditorComponent as any, { block: saved, onChange: clearChange });
    await fireEvent.input(
      clearView.container.querySelector('input[placeholder="File title (optional)"]')!,
      { target: { value: "" } }
    );
    await waitFor(() => expect(clearChange).toHaveBeenCalled());
    const cleared = clearChange.mock.calls.at(-1)![0];
    expect(cleared.data.files[0]).toEqual({
      media_id: "m-1",
      description: "Print before the walk",
    });
    expect(cleared.data.files[1]).toEqual({ media_id: "m-2" });

    registerMediaSource(stubSource());
    const clearedRender = render(RendererComponent as any, { block: cleared });
    const clearedRows = clearedRender.container.querySelectorAll("[data-download-card-file]");
    expect(clearedRows).toHaveLength(2);
    expect(clearedRows[0].querySelector("[data-download-card-file-title]")).toBeNull();
    expect(clearedRows[0].querySelector("a")!.textContent).toBe("trail-map.pdf");
  });
});
