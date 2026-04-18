import { describe, expect, it } from "bun:test";
import { parseVersion } from "./version";

describe("parseVersion", () => {
	it("extracts a semver-style version from gt --version output", () => {
		expect(parseVersion("gt version 1.0.0\n")).toBe("1.0.0");
	});

	it("tolerates surrounding whitespace and trailing content", () => {
		expect(parseVersion("  gt version 2.4.11-rc.1  \nsome notes\n")).toBe(
			"2.4.11-rc.1",
		);
	});

	it("returns null when the output does not contain a version line", () => {
		expect(parseVersion("")).toBeNull();
		expect(parseVersion("gastown diagnostics only\n")).toBeNull();
	});
});
