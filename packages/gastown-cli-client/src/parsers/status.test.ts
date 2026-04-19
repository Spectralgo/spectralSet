import { describe, expect, it } from "bun:test";
import { parseStatus, StatusParseError } from "./status";

const GOLDEN_STATUS_JSON = JSON.stringify({
	name: "spectralGasTown",
	location: "/Users/spectralgo/code/spectralGasTown",
	daemon: { running: true, pid: 92311 },
	dolt: { running: true, pid: 53066, port: 3307 },
	rigs: [
		{
			name: "gmux",
			polecat_count: 4,
			crew_count: 13,
			has_witness: true,
			has_refinery: true,
		},
		{
			name: "spectralTranscript",
			polecat_count: 0,
			crew_count: 0,
			has_witness: false,
			has_refinery: false,
		},
	],
});

describe("parseStatus", () => {
	it("maps fields from gt status --json to ParsedStatus", () => {
		const result = parseStatus(GOLDEN_STATUS_JSON);
		expect(result.townName).toBe("spectralGasTown");
		expect(result.townRoot).toBe("/Users/spectralgo/code/spectralGasTown");
		expect(result.daemonRunning).toBe(true);
		expect(result.doltRunning).toBe(true);
		expect(result.rigs).toEqual([
			{
				name: "gmux",
				witnessRunning: true,
				refineryRunning: true,
				polecatCount: 4,
				crewCount: 13,
				agents: [],
			},
			{
				name: "spectralTranscript",
				witnessRunning: false,
				refineryRunning: false,
				polecatCount: 0,
				crewCount: 0,
				agents: [],
			},
		]);
	});

	it("treats missing daemon/dolt blocks as not running", () => {
		const result = parseStatus(
			JSON.stringify({
				name: "t",
				location: "/tmp/t",
				rigs: [],
			}),
		);
		expect(result.daemonRunning).toBe(false);
		expect(result.doltRunning).toBe(false);
		expect(result.rigs).toEqual([]);
	});

	it("defaults missing rig counts to zero and skips nameless entries", () => {
		const result = parseStatus(
			JSON.stringify({
				name: "t",
				location: "/tmp/t",
				daemon: { running: true },
				dolt: { running: true },
				rigs: [
					{ name: "a", has_witness: true, has_refinery: false },
					{ polecat_count: 3 },
					{
						name: "b",
						polecat_count: -2,
						crew_count: 1.7,
						has_witness: false,
						has_refinery: true,
					},
				],
			}),
		);
		expect(result.rigs).toEqual([
			{
				name: "a",
				witnessRunning: true,
				refineryRunning: false,
				polecatCount: 0,
				crewCount: 0,
				agents: [],
			},
			{
				name: "b",
				witnessRunning: false,
				refineryRunning: true,
				polecatCount: 0,
				crewCount: 1,
				agents: [],
			},
		]);
	});

	it("returns null town fields when absent", () => {
		const result = parseStatus(JSON.stringify({ rigs: [] }));
		expect(result.townName).toBeNull();
		expect(result.townRoot).toBeNull();
	});

	it("throws StatusParseError on non-JSON input", () => {
		expect(() => parseStatus("not json")).toThrow(StatusParseError);
	});

	it("throws StatusParseError on non-object root", () => {
		expect(() => parseStatus(JSON.stringify([1, 2, 3]))).toThrow(
			StatusParseError,
		);
	});

	it("maps rig agents with mixed roles and drops invalid entries", () => {
		const fixture = JSON.stringify({
			name: "town",
			location: "/t",
			daemon: { running: true },
			dolt: { running: true },
			rigs: [
				{
					name: "alpha",
					has_witness: true,
					has_refinery: true,
					polecat_count: 1,
					crew_count: 2,
					agents: [
						{
							name: "jasper",
							role: "polecat",
							session: "a-jasper",
							state: "working",
						},
						{
							name: "refinery",
							role: "refinery",
							session: "a-refinery",
							state: "idle",
						},
						{ name: null, role: "crew", session: null, state: null },
					],
				},
			],
		});
		const agents = parseStatus(fixture).rigs[0]?.agents ?? [];
		expect(agents).toHaveLength(2);
		expect(agents[0]).toEqual({
			rig: "alpha",
			name: "jasper",
			role: "polecat",
			session: "a-jasper",
			state: "working",
		});
		expect(agents[1]).toEqual({
			rig: "alpha",
			name: "refinery",
			role: "refinery",
			session: "a-refinery",
			state: "idle",
		});
	});
});
