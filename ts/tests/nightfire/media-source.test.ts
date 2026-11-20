import { beforeEach, describe, expect, it } from "bun:test";
import { getMediaSource, registerMediaSource, unregisterMediaSource } from "../../src/media-source";
import type { MediaSource } from "../../src/media-source";

function stubSource(overrides: Partial<MediaSource> = {}): MediaSource {
  return {
    pick: async () => null,
    resolve: () => null,
    ...overrides
  };
}

describe("nightfire/media-source", () => {
  beforeEach(() => {
    unregisterMediaSource();
  });

  it("registers the module-level source and hands it back", () => {
    expect(getMediaSource()).toBeNull();

    const source = stubSource();
    registerMediaSource(source);

    expect(getMediaSource()).toBe(source);
  });

  it("replaces a previously registered source", () => {
    const first = stubSource();
    const second = stubSource();

    registerMediaSource(first);
    registerMediaSource(second);

    expect(getMediaSource()).toBe(second);
  });

  it("unregisters, leaving blocks with nothing to resolve through", () => {
    registerMediaSource(stubSource());
    unregisterMediaSource();

    expect(getMediaSource()).toBeNull();
  });

  it("resolves synchronously — resolve is not a promise", () => {
    const resolved = { url: "https://files.example/a.pdf", filename: "a.pdf" };
    registerMediaSource(stubSource({ resolve: () => resolved }));

    const source = getMediaSource();
    expect(source).not.toBeNull();
    // A synchronous result, not a thenable: a renderer resolves inline.
    expect(source!.resolve({ media_id: "a" })).toBe(resolved);
  });
});
