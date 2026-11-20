import { afterEach, describe, expect, it } from "bun:test";
import {
  clearBlockVersions,
  getBlockVersions,
  registerBlockVersions,
  resolveBlockVersion,
  unregisterBlockVersions
} from "../../src/block-versions";

describe("nightfire/block-versions", () => {
  afterEach(() => {
    clearBlockVersions();
  });

  it("defaults to the initial version and fails closed on anything else", () => {
    expect(getBlockVersions("unregistered")).toEqual({
      current: "initial",
      supported: ["initial"]
    });
    expect(resolveBlockVersion("unregistered", "initial")).toBe("initial");
    expect(resolveBlockVersion("unregistered", "2")).toBeNull();
  });

  it("resolves a supported version to the current one", () => {
    registerBlockVersions("callout", { current: "2", supported: ["1", "2"] });

    expect(resolveBlockVersion("callout", "1")).toBe("2");
    expect(resolveBlockVersion("callout", "2")).toBe("2");
    expect(resolveBlockVersion("callout", "9")).toBeNull();
  });

  it("retires a registration", () => {
    registerBlockVersions("video", { current: "2", supported: ["2"] });
    expect(resolveBlockVersion("video", "2")).toBe("2");

    expect(unregisterBlockVersions("video")).toBe(true);
    expect(unregisterBlockVersions("video")).toBe(false);
    expect(resolveBlockVersion("video", "2")).toBeNull();
  });

  it("rejects a version set that lists nothing or omits the current version", () => {
    expect(() => registerBlockVersions("bad", { current: "1", supported: [] })).toThrow(
      /at least one/
    );
    expect(() => registerBlockVersions("bad", { current: "2", supported: ["1"] })).toThrow(
      /current version 2/
    );
    expect(() => registerBlockVersions("bad", { current: "", supported: [""] })).toThrow(
      /current version/
    );
    expect(() => registerBlockVersions("bad", { current: "1", supported: null as any })).toThrow(
      /supported/
    );
    expect(() => registerBlockVersions("bad", { current: "1", supported: [1] as any })).toThrow(
      /non-string/
    );

    expect(() => getBlockVersions("bad")).not.toThrow();
    expect(getBlockVersions("bad")).toEqual({ current: "initial", supported: ["initial"] });
  });

  it("stores a frozen copy of the supported set", () => {
    const supported = ["1", "2"];
    const spec = { current: "2", supported };
    registerBlockVersions("frozen", spec);

    supported.push("3");
    expect(getBlockVersions("frozen").supported).toEqual(["1", "2"]);
    expect(Object.isFrozen(getBlockVersions("frozen"))).toBe(true);
    expect(Object.isFrozen(getBlockVersions("frozen").supported)).toBe(true);
  });
});
