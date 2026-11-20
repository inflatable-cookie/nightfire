import { describe, expect, it } from "bun:test";
import { render } from "../render";

import "../../src/render-registrations";
import { getBlockRenderer } from "../../src/render-registry";

const TableRenderer = getBlockRenderer(undefined, "table") as any;

const cell = (markdown: string, extra: Record<string, unknown> = {}) => ({ markdown, ...extra });

function renderTable(rows: unknown[], caption?: string) {
  const view = render(TableRenderer, { block: { data: { rows, caption } } });
  return view.container;
}

describe("nightfire/table renderer", () => {
  it("renders several section groups whose section is omitted without a duplicate key", () => {
    // Body, head, body: three groups with no `section`. Each used to key on NaN.
    const container = renderTable([
      { cells: [cell("first")] },
      { cells: [cell("heading", { is_header: true })] },
      { cells: [cell("second")] },
    ]);
    expect(container.querySelectorAll("tbody")).toHaveLength(2);
    expect(container.querySelectorAll("thead")).toHaveLength(1);
    expect(container.querySelector("tbody td")?.textContent?.trim()).toBe("first");
  });

  it("drops an alignment value outside the closed vocabularies instead of writing CSS", () => {
    const container = renderTable([
      {
        section: "body",
        cells: [
          cell("hostile", {
            horizontal_align: "left;background:red",
            vertical_align: "top;color:red",
          }),
          cell("aligned", { horizontal_align: "center", vertical_align: "middle" }),
        ],
      },
    ]);
    const [hostile, aligned] = Array.from(container.querySelectorAll("td"));
    expect(hostile!.getAttribute("style")).toBeNull();
    expect(aligned!.style.textAlign).toBe("center");
    expect(aligned!.style.verticalAlign).toBe("middle");
    expect(container.innerHTML).not.toContain("background");
  });

  it("renders a header cell inside a body row as a th", () => {
    const container = renderTable([
      { section: "body", cells: [cell("Row label", { is_header: true }), cell("5")] },
    ]);
    const tbody = container.querySelector("tbody");
    expect(tbody).toBeTruthy();
    expect(container.querySelector("thead")).toBeNull();
    expect(tbody!.querySelector("th")!.textContent?.trim()).toBe("Row label");
    expect(tbody!.querySelector("td")!.textContent?.trim()).toBe("5");
  });

  it("skips a malformed row without cells and renders the rest", () => {
    const container = renderTable([
      { section: "x" },
      null,
      { section: "y", cells: [cell("kept")] },
    ]);
    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(1);
    expect(cells[0]!.textContent?.trim()).toBe("kept");
  });

  it("writes a span only when it is a whole number above one", () => {
    const container = renderTable([
      {
        section: "body",
        cells: [
          cell("a", { colspan: Number.NaN, rowspan: Number.POSITIVE_INFINITY }),
          cell("b", { colspan: 2, rowspan: 3 }),
        ],
      },
    ]);
    const [first, second] = Array.from(container.querySelectorAll("td"));
    expect(first!.hasAttribute("colspan")).toBe(false);
    expect(first!.hasAttribute("rowspan")).toBe(false);
    expect(second!.getAttribute("colspan")).toBe("2");
    expect(second!.getAttribute("rowspan")).toBe("3");
  });

  it("renders cell markdown through the sanitizer", () => {
    const container = renderTable([
      {
        section: "body",
        cells: [cell("**bold** <img src=x onerror=\"globalThis.__pwned=true\">")],
      },
    ]);
    const td = container.querySelector("td")!;
    expect(td.querySelector("strong")?.textContent).toBe("bold");
    expect(td.innerHTML).not.toContain("onerror");
    expect(td.querySelector("img")?.hasAttribute("onerror")).toBeFalsy();
  });

  it("renders no table for an empty or absent row list", () => {
    expect(renderTable([]).querySelector("table")).toBeNull();
    const view = render(TableRenderer, { block: {} });
    expect(view.container.querySelector("table")).toBeNull();
  });

  it("emits no scoped style block and no consumer token", () => {
    const container = renderTable([{ section: "body", cells: [cell("x")] }], "Caption");
    expect(container.querySelector("style")).toBeNull();
    expect(container.innerHTML).not.toContain("--nightfire-");
    expect(container.querySelector("caption")?.textContent).toBe("Caption");
  });
});
