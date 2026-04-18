import { describe, expect, it } from "bun:test";
import {
	isNukeSafetyFailure,
	NukeParseError,
	parseNukeSafetyReasons,
	parseNukeSuccess,
} from "./nuke";

const SUCCESS_FIXTURE = `Nuking spectralSet/ember...
  ○ worktree already gone
  ○ Closed agent bead: ss-spectralSet-polecat-ember
Purged closed ephemeral beads: ✓ Purged 1 closed ephemeral bead(s)

✓ Nuked 1 polecat(s).
`;

const SUCCESS_NO_BEAD_FIXTURE = `Nuking spectralSet/nonexistent-test...
  ○ worktree already gone
  ○ agent bead not found or already cleaned
Purged closed ephemeral beads: ✓ Purged 1 closed ephemeral bead(s)

✓ Nuked 1 polecat(s).
`;

const SAFETY_FAILURE_STDERR = `Error: Cannot nuke the following polecats:

  spectralSet/jasper:
    - cleanup status unknown
    - has work on hook (ss-1kv)

Safety checks failed. Resolve issues before nuking, or use --force.
Options:
  1. Complete work: gt done (from polecat session)
  2. Push changes: git push (from polecat worktree)
  3. Escalate: gt mail send mayor/ -s "RECOVERY_NEEDED" -m "..."
  4. Force nuke (LOSES WORK): gt polecat nuke --force spectralSet/jasper

Error: blocked: 1 polecat(s) have active work
`;

describe("parseNukeSuccess", () => {
	it("parses the Nuked count and closed bead", () => {
		const result = parseNukeSuccess(SUCCESS_FIXTURE);
		expect(result.nukedCount).toBe(1);
		expect(result.closedBead).toBe("ss-spectralSet-polecat-ember");
	});

	it("parses count without a closed bead", () => {
		const result = parseNukeSuccess(SUCCESS_NO_BEAD_FIXTURE);
		expect(result.nukedCount).toBe(1);
		expect(result.closedBead).toBeUndefined();
	});

	it("throws NukeParseError when success marker missing", () => {
		expect(() => parseNukeSuccess("nothing here")).toThrow(NukeParseError);
	});
});

describe("isNukeSafetyFailure", () => {
	it("detects the safety-failure banner", () => {
		expect(isNukeSafetyFailure(SAFETY_FAILURE_STDERR)).toBe(true);
	});

	it("returns false for unrelated stderr", () => {
		expect(isNukeSafetyFailure("Error: something else\n")).toBe(false);
	});
});

describe("parseNukeSafetyReasons", () => {
	it("extracts each indented bullet reason", () => {
		const reasons = parseNukeSafetyReasons(SAFETY_FAILURE_STDERR);
		expect(reasons).toEqual([
			"cleanup status unknown",
			"has work on hook (ss-1kv)",
		]);
	});

	it("ignores numbered suggestions and returns [] when no reasons", () => {
		const stderr = "Options:\n  1. foo\n  2. bar\n";
		expect(parseNukeSafetyReasons(stderr)).toEqual([]);
	});
});
