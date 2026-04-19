import { describe, expect, it } from "bun:test";
import { parseRigList } from "./rigs";

const MULTI_RIG_FIXTURE = `Rigs in /Users/demo/code/spectralGasTown:

🟢 gmux
   Witness: ● running  Refinery: ● running
   Polecats: 4  Crew: 13

🟢 spectralChat
   Witness: ● running  Refinery: ● running
   Polecats: 2  Crew: 3

⚫ spectralTranscript
   Witness: ○ stopped  Refinery: ○ stopped
   Polecats: 0  Crew: 0
`;

const SINGLE_RUNNING_FIXTURE = `Rigs in /tmp:

🟢 solo
   Witness: ● running  Refinery: ● running
   Polecats: 7  Crew: 0
`;

const EMPTY_FIXTURE = `Rigs in /tmp:

(no rigs configured)
`;

describe("parseRigList", () => {
	it("parses multiple rigs with mixed running and stopped state", () => {
		const rigs = parseRigList(MULTI_RIG_FIXTURE);
		expect(rigs).toEqual([
			{
				name: "gmux",
				witnessRunning: true,
				refineryRunning: true,
				polecatCount: 4,
				crewCount: 13,
				agents: [],
			},
			{
				name: "spectralChat",
				witnessRunning: true,
				refineryRunning: true,
				polecatCount: 2,
				crewCount: 3,
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

	it("parses a single running rig", () => {
		expect(parseRigList(SINGLE_RUNNING_FIXTURE)).toEqual([
			{
				name: "solo",
				witnessRunning: true,
				refineryRunning: true,
				polecatCount: 7,
				crewCount: 0,
				agents: [],
			},
		]);
	});

	it("returns an empty list when no rigs are present", () => {
		expect(parseRigList(EMPTY_FIXTURE)).toEqual([]);
		expect(parseRigList("")).toEqual([]);
	});
});
