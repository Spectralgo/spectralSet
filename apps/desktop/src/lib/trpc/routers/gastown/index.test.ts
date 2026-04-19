import { describe, expect, it } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveTownPath } from "./index";

describe("resolveTownPath", () => {
	it("returns undefined when input is undefined", () => {
		expect(resolveTownPath(undefined)).toBeUndefined();
	});

	it("returns undefined for empty string", () => {
		expect(resolveTownPath("")).toBeUndefined();
	});

	it("returns undefined for whitespace-only string", () => {
		expect(resolveTownPath("   ")).toBeUndefined();
	});

	it("expands a leading ~/ to the user's home directory", () => {
		expect(resolveTownPath("~/code/spectralGasTown")).toBe(
			join(homedir(), "code/spectralGasTown"),
		);
	});

	it("expands a bare ~ to the user's home directory", () => {
		expect(resolveTownPath("~")).toBe(homedir());
	});

	it("strips a trailing slash after expansion", () => {
		expect(resolveTownPath("~/code/spectralGasTown/")).toBe(
			join(homedir(), "code/spectralGasTown"),
		);
	});

	it("strips multiple trailing slashes", () => {
		expect(resolveTownPath("/abs/path///")).toBe("/abs/path");
	});

	it("leaves absolute paths unchanged", () => {
		expect(resolveTownPath("/Users/test/gastown")).toBe("/Users/test/gastown");
	});

	it("leaves ~user-style prefixes unchanged (out of scope)", () => {
		expect(resolveTownPath("~bob/foo")).toBe("~bob/foo");
	});
});
