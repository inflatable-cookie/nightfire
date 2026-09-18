// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "../vitest";
import { cleanup, fireEvent, render, waitFor, within } from "../render";

import "../../src/editor-registrations";
import "../../src/render-registrations";
import { getBlockEditor, isBlockContentEmpty } from "../../src/editor-registry";
import { getBlockRenderer } from "../../src/render-registry";

const EditorComponent = getBlockEditor(undefined, "item_list");
const RendererComponent = getBlockRenderer(undefined, "item_list");

afterEach(cleanup);

function itemListBlock(data: Record<string, unknown> = {}) {
  return {
    id: "nf_item_list",
    type: "item_list",
    version: "initial",
    data,
  };
}

function lastBlock(onChange: ReturnType<typeof vi.fn>) {
  return onChange.mock.calls.at(-1)![0];
}

describe("nightfire/item-list editor", () => {
  it("registers the editor and treats only titled or non-empty items as content", () => {
    expect(EditorComponent).toBeTruthy();
    expect(RendererComponent).toBeTruthy();
    expect(isBlockContentEmpty(itemListBlock())).toBe(true);
    expect(isBlockContentEmpty(itemListBlock({ items: [{ body: [] }] }))).toBe(true);
    expect(
      isBlockContentEmpty(
        itemListBlock({
          items: [{ body: [{ type: "markdown", data: { text: "Body" } }] }],
        }),
      ),
    ).toBe(false);
    expect(isBlockContentEmpty(itemListBlock({ items: [{ title: "Heading", body: [] }] }))).toBe(
      false,
    );
  });

  it("adds, edits, nests, reorders, and reloads items without dropping unmanaged data", async () => {
    const onChange = vi.fn();
    const initial = itemListBlock({
      intro: { type: "rich_text", retained: true },
      variant: "ordered",
      items: [],
    });

    let view = render(EditorComponent as any, {
      block: initial,
      value: { schema: "example:content/list" },
      onChange,
    });

    await fireEvent.keyDown(within(view.container).getByRole("button", { name: "Add item" }), {
      key: "Enter",
    });
    let current = lastBlock(onChange);
    expect(current.data.intro).toEqual({ type: "rich_text", retained: true });
    expect(current.data.variant).toBe("ordered");
    expect(current.data.items).toHaveLength(1);

    view = render(EditorComponent as any, {
      block: current,
      value: { schema: "example:content/list" },
      onChange,
    });
    await fireEvent.input(
      within(view.container).getByRole("textbox", { name: "Item 1 title (optional)" }),
      { target: { value: "First" } },
    );
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    current = lastBlock(onChange);

    view = render(EditorComponent as any, {
      block: current,
      value: { schema: "example:content/list" },
      onChange,
    });
    await fireEvent.click(within(view.container).getByRole("button", { name: "Add item" }));
    current = lastBlock(onChange);

    view = render(EditorComponent as any, {
      block: current,
      value: { schema: "example:content/list" },
      onChange,
    });
    await fireEvent.input(
      within(view.container).getByRole("textbox", { name: "Item 2 title (optional)" }),
      { target: { value: "Second" } },
    );
    await waitFor(() => expect(onChange.mock.calls.at(-1)![0].data.items[1].title).toBe("Second"));
    current = lastBlock(onChange);

    view = render(EditorComponent as any, {
      block: current,
      value: { schema: "example:content/list" },
      onChange,
    });
    await fireEvent.click(
      within(view.container).getByRole("button", { name: "Add child block to item 2" }),
    );
    current = lastBlock(onChange);
    expect(current.data.items[1].body[0].type).toBe("markdown");

    view = render(EditorComponent as any, {
      block: current,
      value: { schema: "example:content/list" },
      onChange,
    });
    const markdown = within(view.container).getByPlaceholderText("Write markdown...");
    await fireEvent.input(markdown, { target: { value: "Nested body" } });
    await waitFor(() =>
      expect(onChange.mock.calls.at(-1)![0].data.items[1].body[0].data.text).toBe("Nested body"),
    );
    current = lastBlock(onChange);

    view = render(EditorComponent as any, {
      block: current,
      value: { schema: "example:content/list" },
      onChange,
    });
    await fireEvent.keyDown(
      within(view.container).getByRole("button", { name: "Move item 2 up" }),
      { key: "Enter" },
    );
    current = lastBlock(onChange);
    expect(current.data.items.map((item: any) => item.title)).toEqual(["Second", "First"]);
    expect(current.data.items[0].body[0].data.text).toBe("Nested body");
    expect(current.data.intro).toEqual({ type: "rich_text", retained: true });
    expect(current.data.variant).toBe("ordered");

    const reloaded = render(RendererComponent as any, { block: current });
    expect(reloaded.container.querySelector("[data-item-list-title]")).toBeNull();
    expect(reloaded.container.querySelectorAll("[data-item-list-item]")).toHaveLength(2);
    expect(reloaded.container.textContent).toContain("Second");
    expect(reloaded.container.textContent).toContain("Nested body");
  });

  it("confirms before removing a content-bearing item and preserves it on refusal", async () => {
    const onChange = vi.fn();
    const block = itemListBlock({
      items: [
        { title: "Empty item", body: [] },
        { body: [{ type: "markdown", version: "initial", data: { text: "Keep me" } }] },
      ],
    });
    const view = render(EditorComponent as any, {
      block,
      value: { schema: "example:content/list" },
      onChange,
    });

    await fireEvent.keyDown(
      within(view.container).getByRole("button", { name: "Remove item 2" }),
      { key: "Enter" },
    );
    expect(onChange).not.toHaveBeenCalled();
    const dialog = within(view.container).getByRole("alertdialog");
    expect(dialog.textContent).toContain("cannot be undone");

    await fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(within(view.container).getByRole("button", { name: "Remove item 2" })).toBeTruthy();

    await fireEvent.keyDown(
      within(view.container).getByRole("button", { name: "Remove item 2" }),
      { key: "Enter" },
    );
    await fireEvent.click(
      within(view.container).getByRole("button", { name: "Confirm removal" }),
    );
    expect(lastBlock(onChange).data.items).toEqual([{ title: "Empty item", body: [] }]);
  });
});
