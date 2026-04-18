import { describe, expect, it } from "bun:test";
import { parseRecovery, RecoveryParseError } from "./recovery";

const SAFE_FIXTURE = JSON.stringify({
	rig: "spectralSet",
	polecat: "ember",
	cleanup_status: "clean",
	needs_recovery: false,
	verdict: "SAFE_TO_NUKE",
	branch: "polecat/ember-abc123",
});

const UNCOMMITTED_FIXTURE = JSON.stringify({
	rig: "spectralSet",
	polecat: "onyx",
	cleanup_status: "has_uncommitted",
	needs_recovery: true,
	verdict: "NEEDS_RECOVERY",
	branch: "polecat/onyx-mo4lyibf",
});

const UNPUSHED_WITH_HOOK_FIXTURE = JSON.stringify({
	rig: "spectralSet",
	polecat: "obsidian",
	cleanup_status: "has_unpushed",
	needs_recovery: true,
	verdict: "NEEDS_RECOVERY",
	branch: "polecat/obsidian-mo4fealz",
	issue: "ss-bj5",
});

const UNKNOWN_WITH_HOOK_FIXTURE = JSON.stringify({
	rig: "spectralSet",
	polecat: "jasper",
	cleanup_status: "",
	needs_recovery: true,
	verdict: "NEEDS_RECOVERY",
	branch: "polecat/jasper-mo4n0k5n",
	issue: "ss-1kv",
});

const MQ_SUBMIT_FIXTURE = JSON.stringify({
	rig: "spectralSet",
	polecat: "quartz",
	cleanup_status: "clean",
	needs_recovery: false,
	verdict: "NEEDS_MQ_SUBMIT",
});

describe("parseRecovery", () => {
	it("reports canNuke=true for SAFE_TO_NUKE", () => {
		const result = parseRecovery(SAFE_FIXTURE);
		expect(result.canNuke).toBe(true);
		expect(result.reason).toBeUndefined();
		expect(result.suggestions).toBeUndefined();
		expect(result.status.rig).toBe("spectralSet");
		expect(result.status.polecat).toBe("ember");
	});

	it("flags uncommitted changes", () => {
		const result = parseRecovery(UNCOMMITTED_FIXTURE);
		expect(result.canNuke).toBe(false);
		expect(result.suggestions).toEqual(["has uncommitted changes"]);
		expect(result.reason).toBe("has uncommitted changes");
		expect(result.status.cleanupStatus).toBe("has_uncommitted");
	});

	it("flags unpushed commits + hook", () => {
		const result = parseRecovery(UNPUSHED_WITH_HOOK_FIXTURE);
		expect(result.canNuke).toBe(false);
		expect(result.suggestions).toEqual([
			"has unpushed commits",
			"has work on hook (ss-bj5)",
		]);
	});

	it("flags unknown cleanup status + hook", () => {
		const result = parseRecovery(UNKNOWN_WITH_HOOK_FIXTURE);
		expect(result.canNuke).toBe(false);
		expect(result.suggestions).toEqual([
			"cleanup status unknown",
			"has work on hook (ss-1kv)",
		]);
	});

	it("flags NEEDS_MQ_SUBMIT as a blocker", () => {
		const result = parseRecovery(MQ_SUBMIT_FIXTURE);
		expect(result.canNuke).toBe(false);
		expect(result.suggestions).toEqual(["work not submitted to merge queue"]);
	});

	it("throws RecoveryParseError on invalid JSON", () => {
		expect(() => parseRecovery("not json")).toThrow(RecoveryParseError);
	});

	it("throws RecoveryParseError when required fields are missing", () => {
		expect(() => parseRecovery(JSON.stringify({ foo: "bar" }))).toThrow(
			RecoveryParseError,
		);
	});
});
