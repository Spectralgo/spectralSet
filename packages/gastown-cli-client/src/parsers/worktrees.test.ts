import { describe, expect, test } from "bun:test";
import { parseWorktreeList } from "./worktrees";

describe("parseWorktreeList", () => {
	test("parses a typical Gas Town bare + polecat listing", () => {
		const stdout = [
			"worktree /town/spectralSet/.repo.git",
			"bare",
			"",
			"worktree /town/spectralSet/refinery/rig",
			"HEAD 6951db72abcdef",
			"branch refs/heads/main",
			"",
			"worktree /town/spectralSet/polecats/onyx/spectralSet",
			"HEAD deadbeef",
			"branch refs/heads/polecat/onyx-mo5xo851",
			"",
			"worktree /town/spectralSet/polecats/quartz/spectralSet",
			"HEAD cafebabe",
			"detached",
			"",
		].join("\n");

		const result = parseWorktreeList(stdout);
		expect(result).toHaveLength(4);

		expect(result[0]).toMatchObject({
			path: "/town/spectralSet/.repo.git",
			isBare: true,
			isDetached: false,
			branch: null,
		});
		expect(result[1]).toMatchObject({
			path: "/town/spectralSet/refinery/rig",
			branch: "main",
			head: "6951db72abcdef",
			isBare: false,
			isDetached: false,
		});
		expect(result[2]).toMatchObject({
			path: "/town/spectralSet/polecats/onyx/spectralSet",
			branch: "polecat/onyx-mo5xo851",
			head: "deadbeef",
			isBare: false,
			isDetached: false,
		});
		expect(result[3]).toMatchObject({
			path: "/town/spectralSet/polecats/quartz/spectralSet",
			branch: null,
			head: "cafebabe",
			isBare: false,
			isDetached: true,
		});
	});

	test("returns empty for empty stdout", () => {
		expect(parseWorktreeList("")).toEqual([]);
		expect(parseWorktreeList("\n\n")).toEqual([]);
	});

	test("handles Windows line endings", () => {
		const stdout = "worktree /foo\r\nHEAD abc\r\nbranch refs/heads/main\r\n";
		const result = parseWorktreeList(stdout);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			path: "/foo",
			branch: "main",
			head: "abc",
		});
	});

	test("skips paragraphs without a worktree line", () => {
		const stdout = [
			"HEAD abc",
			"branch refs/heads/main",
			"",
			"worktree /valid",
			"HEAD def",
			"branch refs/heads/main",
		].join("\n");
		const result = parseWorktreeList(stdout);
		expect(result).toHaveLength(1);
		expect(result[0]?.path).toBe("/valid");
	});

	test("preserves legacy polecat branch names", () => {
		const stdout = [
			"worktree /polecats/obsidian/spectralSet",
			"HEAD abc",
			"branch refs/heads/polecat/obsidian/ss-7cs@mo4enqwh",
		].join("\n");
		const result = parseWorktreeList(stdout);
		expect(result[0]?.branch).toBe("polecat/obsidian/ss-7cs@mo4enqwh");
	});
});
