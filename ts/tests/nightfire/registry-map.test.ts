import { describe, expect, it } from "../vitest";
import { KeyedRegistry, SchemaScopedRegistry } from "../../src/registry-map";

describe("nightfire/registry-map", () => {
	it("resolves a schema entry before the wildcard entry", () => {
		const registry = new SchemaScopedRegistry<string>();
		registry.set(null, "markdown", "wildcard editor");
		registry.set("acme:content", "markdown", "acme editor");

		expect(registry.get("acme:content", "markdown")).toBe("acme editor");
		expect(registry.get("other:content", "markdown")).toBe("wildcard editor");
		expect(registry.get("acme:content", "missing")).toBeNull();
	});

	it("lists a schema's own entries first, then the wildcard entries it does not override", () => {
		const registry = new SchemaScopedRegistry<string>();
		registry.set(null, "markdown", "wildcard markdown");
		registry.set(null, "image", "wildcard image");
		registry.set("acme:content", "table", "acme table");
		registry.set("acme:content", "markdown", "acme markdown");

		expect(registry.entriesForSchema("acme:content")).toEqual([
			{ type: "table", value: "acme table" },
			{ type: "markdown", value: "acme markdown" },
			{ type: "image", value: "wildcard image" }
		]);
	});

	it("retires one entry and drops the empty scope", () => {
		const registry = new SchemaScopedRegistry<string>();
		registry.set("acme:content", "markdown", "acme markdown");

		expect(registry.get("acme:content", "markdown")).toBe("acme markdown");
		expect(registry.delete("acme:content", "markdown")).toBe(true);
		expect(registry.delete("acme:content", "markdown")).toBe(false);
		expect(registry.get("acme:content", "markdown")).toBeNull();
		expect(registry.size).toBe(0);
	});

	it("clears every scope", () => {
		const registry = new SchemaScopedRegistry<string>();
		registry.set(null, "markdown", "wildcard markdown");
		registry.set("acme:content", "markdown", "acme markdown");

		registry.clear();

		expect(registry.size).toBe(0);
		expect(registry.get("acme:content", "markdown")).toBeNull();
	});

	it("keys a plain registry by one string", () => {
		const registry = new KeyedRegistry<number>();

		registry.set("markdown", 1);
		expect(registry.get("markdown")).toBe(1);
		expect(registry.get("missing")).toBeNull();
		expect(registry.delete("markdown")).toBe(true);
		expect(registry.size).toBe(0);
	});
});
