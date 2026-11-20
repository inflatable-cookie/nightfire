import { afterEach, describe, expect, it } from "../vitest";
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
		expect(getBlockVersions("unregistered")).toEqual({ current: "initial", supported: ["initial"] });
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
});
