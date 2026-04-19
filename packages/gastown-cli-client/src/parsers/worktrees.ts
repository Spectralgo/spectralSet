import type { Worktree } from "../types";

/**
 * Parses the output of `git worktree list --porcelain`.
 *
 * Format is paragraph-based: each worktree's attributes are newline-
 * separated, paragraphs themselves separated by blank lines. A worktree
 * paragraph always starts with `worktree <path>`. Example:
 *
 * ```
 * worktree /Users/.../spectralGasTown/spectralSet/.repo.git
 * bare
 *
 * worktree /Users/.../spectralGasTown/spectralSet/refinery/rig
 * HEAD 6951db72...
 * branch refs/heads/main
 *
 * worktree /Users/.../spectralGasTown/spectralSet/polecats/onyx/spectralSet
 * HEAD abcdef...
 * detached
 * ```
 */
export function parseWorktreeList(stdout: string): Worktree[] {
	const worktrees: Worktree[] = [];
	const paragraphs = stdout.split(/\r?\n\r?\n/);

	for (const paragraph of paragraphs) {
		const lines = paragraph
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
		if (lines.length === 0) continue;

		let path: string | null = null;
		let head = "";
		let branch: string | null = null;
		let isBare = false;
		let isDetached = false;

		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				path = line.slice("worktree ".length).trim();
			} else if (line === "bare") {
				isBare = true;
			} else if (line === "detached") {
				isDetached = true;
			} else if (line.startsWith("HEAD ")) {
				head = line.slice("HEAD ".length).trim();
			} else if (line.startsWith("branch ")) {
				const raw = line.slice("branch ".length).trim();
				branch = raw.startsWith("refs/heads/")
					? raw.slice("refs/heads/".length)
					: raw;
			}
		}

		if (!path) continue;
		worktrees.push({ path, branch, head, isBare, isDetached });
	}

	return worktrees;
}
