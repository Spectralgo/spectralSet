import { describe, expect, it } from "bun:test";
import { parsePeek } from "./peek";

describe("parsePeek", () => {
	it("normalizes CRLF line endings and strips trailing whitespace", () => {
		const raw = "line one\r\nline two\r\n\r\n   \n";
		expect(parsePeek(raw)).toEqual({ output: "line one\nline two" });
	});

	it("preserves leading whitespace and internal blank lines", () => {
		const raw = "  header\n\n  body\n";
		expect(parsePeek(raw)).toEqual({ output: "  header\n\n  body" });
	});

	it("returns empty string for empty input", () => {
		expect(parsePeek("")).toEqual({ output: "" });
		expect(parsePeek("   \n\n")).toEqual({ output: "" });
	});
});
