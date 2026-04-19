import { describe, expect, test } from "bun:test";
import type { Polecat, Worktree } from "@spectralset/gastown-cli-client";
import {
	extractPolecatWorkspaceSpecs,
	findArchivedPolecats,
} from "./polecat-discovery";

function worktree(overrides: Partial<Worktree>): Worktree {
	return {
		path: "/town/alpha/polecats/jasper/alpha",
		branch: "polecat/jasper-mo5xo851",
		head: "abc",
		isBare: false,
		isDetached: false,
		...overrides,
	};
}

function polecat(overrides: Partial<Polecat>): Polecat {
	return {
		rig: "alpha",
		name: "jasper",
		state: "working",
		...overrides,
	};
}

describe("extractPolecatWorkspaceSpecs", () => {
	test("projects a polecat + worktree pair into a spec", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [worktree({})],
			polecats: [polecat({ currentBead: "a-42" })],
		});
		expect(specs).toHaveLength(1);
		expect(specs[0]).toMatchObject({
			town: "/town",
			rig: "alpha",
			polecatName: "jasper",
			worktreePath: "/town/alpha/polecats/jasper/alpha",
			branch: "polecat/jasper-mo5xo851",
			beadId: "a-42",
			state: "working",
		});
	});

	test("skips bare repos", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [
				worktree({ path: "/town/alpha/.repo.git", isBare: true, branch: null }),
				worktree({}),
			],
			polecats: [polecat({})],
		});
		expect(specs).toHaveLength(1);
		expect(specs[0].polecatName).toBe("jasper");
	});

	test("skips non-polecat worktrees (refinery checkout on main)", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [
				worktree({
					path: "/town/alpha/refinery/rig",
					branch: "main",
				}),
			],
			polecats: [],
		});
		expect(specs).toEqual([]);
	});

	test("skips orphan sandboxes with no matching polecat identity", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [worktree({})],
			polecats: [],
		});
		expect(specs).toEqual([]);
	});

	test("skips polecats from other rigs", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [worktree({})],
			polecats: [polecat({ rig: "beta" })],
		});
		expect(specs).toEqual([]);
	});

	test("correlates via legacy branch format polecat/<name>/<bead>@<ulid>", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [
				worktree({
					branch: "polecat/obsidian/a-7cs@mo4enqwh",
					path: "/town/alpha/polecats/obsidian/alpha",
				}),
			],
			polecats: [polecat({ name: "obsidian" })],
		});
		expect(specs).toHaveLength(1);
		expect(specs[0].polecatName).toBe("obsidian");
	});

	test("falls back to path-segment extraction when branch is detached", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [
				worktree({
					branch: null,
					isDetached: true,
					path: "/town/alpha/polecats/quartz/alpha",
				}),
			],
			polecats: [polecat({ name: "quartz" })],
		});
		expect(specs).toHaveLength(1);
		expect(specs[0].polecatName).toBe("quartz");
	});

	test("carries bead id when the polecat is not currently hooked", () => {
		const specs = extractPolecatWorkspaceSpecs({
			town: "/town",
			rig: "alpha",
			worktrees: [worktree({})],
			polecats: [polecat({ currentBead: undefined })],
		});
		expect(specs[0].beadId).toBeNull();
	});
});

describe("findArchivedPolecats", () => {
	test("returns names present in existing rows but absent from the live specs", () => {
		const known = new Map([
			[
				"jasper",
				{
					town: "/t",
					rig: "alpha",
					polecatName: "jasper",
					worktreePath: "/t/alpha/polecats/jasper/alpha",
					branch: null,
					beadId: null,
					state: "idle" as const,
				},
			],
		]);
		const archived = findArchivedPolecats({
			known,
			existingRows: [
				{ gastownPolecatName: "jasper" },
				{ gastownPolecatName: "obsidian" },
				{ gastownPolecatName: null }, // non-polecat row, ignored
			],
		});
		expect(archived).toEqual(["obsidian"]);
	});

	test("returns empty when all existing rows are still live", () => {
		const known = new Map([
			[
				"jasper",
				{
					town: "/t",
					rig: "alpha",
					polecatName: "jasper",
					worktreePath: "/t/alpha/polecats/jasper/alpha",
					branch: null,
					beadId: null,
					state: "idle" as const,
				},
			],
		]);
		const archived = findArchivedPolecats({
			known,
			existingRows: [{ gastownPolecatName: "jasper" }],
		});
		expect(archived).toEqual([]);
	});
});
