// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "../vitest";
import { render, waitFor } from "../render";

import fixture from "../../../fixtures/wire/v1/nightfire-values.json";
import { CORE_BLOCK_TYPE_NAMES } from "../../src/core-blocks";
import "../../src/render-registrations";
import { getBlockRenderer } from "../../src/render-registry";
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

const corePayloads = fixture.values.find((entry) => entry.name === "core-payloads");

afterEach(() => {
  unregisterMediaSource();
});

describe("core-payloads representatives", () => {
  it("exist in the shared fixture", () => {
    expect(corePayloads).toBeTruthy();
    expect(corePayloads!.value.blocks.map((block) => block.type).sort()).toEqual(
      [...CORE_BLOCK_TYPE_NAMES].sort(),
    );
  });

  it("render through each block's own renderer", async () => {
    registerMediaSource({
      pick: async () => null,
      resolve: () => ({
        url: "https://files.example/hero.jpg",
        filename: "hero.jpg",
        width: 1600,
        height: 900,
        title: "Library title",
        size: 1024,
      }),
    });

    for (const block of corePayloads!.value.blocks) {
      const Renderer = getBlockRenderer(undefined, block.type);
      expect(Renderer, block.type).toBeTruthy();
      const view = render(Renderer as never, { block });
      await waitFor(() => {
        expect(
          view.container.querySelector(`[data-nightfire-block="${block.type}"]`),
          block.type,
        ).toBeTruthy();
      });
    }
  });
});
