import { describe, expect, it } from "bun:test";
import { parseSlingResult, SlingParseError } from "./sling";

const SPAWNED_FIXTURE = `Slinging ss-mqi → spectralSet
Polecat jasper spawned
Formula wisp created: ss-wisp-3nkc
Attached to jasper's hook.
`;

const REUSED_FIXTURE = `Reusing idle polecat: onyx
Formula wisp created: ss-wisp-9aa9
Slung ss-abc to spectralSet/onyx.
`;

describe("parseSlingResult", () => {
	it("parses a fresh-spawn sling output", () => {
		expect(parseSlingResult(SPAWNED_FIXTURE)).toEqual({
			polecat: "jasper",
			wispId: "ss-wisp-3nkc",
		});
	});

	it("parses a reused-polecat sling output", () => {
		expect(parseSlingResult(REUSED_FIXTURE)).toEqual({
			polecat: "onyx",
			wispId: "ss-wisp-9aa9",
		});
	});

	it("throws SlingParseError when the polecat line is missing", () => {
		expect(() =>
			parseSlingResult("Formula wisp created: ss-wisp-1234\n"),
		).toThrow(SlingParseError);
	});

	it("throws SlingParseError when the wisp line is missing", () => {
		expect(() => parseSlingResult("Polecat jasper spawned\n")).toThrow(
			SlingParseError,
		);
	});
});
