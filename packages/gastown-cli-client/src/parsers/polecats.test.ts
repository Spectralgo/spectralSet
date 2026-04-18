import { describe, expect, it } from "bun:test";
import { parsePolecatList } from "./polecats";

const MULTI_RIG_FIXTURE = `Polecats

  ○ gmux/chrome  done
    gm-ebc
  ○ gmux/guzzle  done
    gm-mzi
  ○ spectralChat/furiosa  idle
  ● spectralSet/jasper  working
  ○ spectralSet/obsidian  done
    ss-bj5
  ● spectralSet/onyx  working
    ss-7a9
`;

const SINGLE_RIG_FIXTURE = `Polecats

  ● gmux/chrome  working
    gm-abc
`;

const ZOMBIE_FIXTURE = `Polecats

  ○ spectralSet/ghost  zombie
    ss-999
  ○ spectralSet/ashes  nuked
  ○ spectralSet/amber  stalled
    ss-111
`;

const EMPTY_FIXTURE = `Polecats

(no polecats)
`;

describe("parsePolecatList", () => {
	it("parses polecats across rigs with and without current beads", () => {
		expect(parsePolecatList(MULTI_RIG_FIXTURE)).toEqual([
			{ rig: "gmux", name: "chrome", state: "done", currentBead: "gm-ebc" },
			{ rig: "gmux", name: "guzzle", state: "done", currentBead: "gm-mzi" },
			{ rig: "spectralChat", name: "furiosa", state: "idle" },
			{ rig: "spectralSet", name: "jasper", state: "working" },
			{
				rig: "spectralSet",
				name: "obsidian",
				state: "done",
				currentBead: "ss-bj5",
			},
			{
				rig: "spectralSet",
				name: "onyx",
				state: "working",
				currentBead: "ss-7a9",
			},
		]);
	});

	it("parses a single-polecat rig", () => {
		expect(parsePolecatList(SINGLE_RIG_FIXTURE)).toEqual([
			{ rig: "gmux", name: "chrome", state: "working", currentBead: "gm-abc" },
		]);
	});

	it("parses zombie / nuked / stalled states", () => {
		expect(parsePolecatList(ZOMBIE_FIXTURE)).toEqual([
			{
				rig: "spectralSet",
				name: "ghost",
				state: "zombie",
				currentBead: "ss-999",
			},
			{ rig: "spectralSet", name: "ashes", state: "nuked" },
			{
				rig: "spectralSet",
				name: "amber",
				state: "stalled",
				currentBead: "ss-111",
			},
		]);
	});

	it("returns an empty list when no polecats are present", () => {
		expect(parsePolecatList(EMPTY_FIXTURE)).toEqual([]);
		expect(parsePolecatList("")).toEqual([]);
	});
});
