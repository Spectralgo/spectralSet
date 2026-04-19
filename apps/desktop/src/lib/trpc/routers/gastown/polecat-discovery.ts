import type { Polecat, Worktree } from "@spectralset/gastown-cli-client";

/**
 * Polecat-worktree correlation + projection into SpectralSet workspace
 * row shape. Pure logic; all I/O is injected by the caller. The tRPC
 * procedure wraps this with the actual list calls and DB inserts.
 *
 * See ai_docs/WORKTREE-BRIDGE-DESIGN.md §§2-4.
 */

/** Matches both current and legacy polecat branch naming conventions. */
const POLECAT_BRANCH_RE = /^polecat\/([a-z0-9_-]+?)(?:-mo[0-9a-z]+|\/[^@]+@mo[0-9a-z]+)$/i;

/** Extracts the polecat name segment from the sandbox path. */
const POLECAT_PATH_SEGMENT_RE = /\/polecats\/([^/]+)\//;

export interface PolecatWorkspaceSpec {
	town: string;
	rig: string;
	polecatName: string;
	worktreePath: string;
	branch: string | null;
	beadId: string | null;
	state: Polecat["state"];
}

export interface DiscoveryInput {
	town: string;
	rig: string;
	worktrees: readonly Worktree[];
	polecats: readonly Polecat[];
}

/**
 * Returns the set of polecat-worktree pairs that should be registered
 * as SpectralSet workspaces. Filters out the bare repo, the refinery
 * checkout, and orphan worktrees whose polecat identity is no longer
 * known to Gas Town.
 */
export function extractPolecatWorkspaceSpecs(
	input: DiscoveryInput,
): PolecatWorkspaceSpec[] {
	const polecatByName = new Map<string, Polecat>();
	for (const polecat of input.polecats) {
		if (polecat.rig !== input.rig) continue;
		polecatByName.set(polecat.name, polecat);
	}

	const specs: PolecatWorkspaceSpec[] = [];
	for (const worktree of input.worktrees) {
		if (worktree.isBare) continue;

		const polecatName = polecatNameFromWorktree(worktree);
		if (!polecatName) continue;

		const polecat = polecatByName.get(polecatName);
		if (!polecat) continue; // orphan sandbox — gt polecat list doesn't know it

		specs.push({
			town: input.town,
			rig: input.rig,
			polecatName,
			worktreePath: worktree.path,
			branch: worktree.branch,
			beadId: polecat.currentBead ?? null,
			state: polecat.state,
		});
	}

	return specs;
}

/**
 * Returns polecat names that currently have a SpectralSet workspace
 * row but no matching live worktree/polecat. Callers should mark those
 * rows archived.
 */
export function findArchivedPolecats(opts: {
	known: ReadonlyMap<string, PolecatWorkspaceSpec>;
	existingRows: ReadonlyArray<{ gastownPolecatName: string | null }>;
}): string[] {
	const archived: string[] = [];
	for (const row of opts.existingRows) {
		const name = row.gastownPolecatName;
		if (!name) continue;
		if (!opts.known.has(name)) archived.push(name);
	}
	return archived;
}

function polecatNameFromWorktree(worktree: Worktree): string | null {
	// Prefer branch-based extraction (handles both naming conventions).
	if (worktree.branch) {
		const m = worktree.branch.match(POLECAT_BRANCH_RE);
		if (m?.[1]) return m[1];
	}
	// Fallback to path segment (e.g., …/polecats/<name>/<rig>/).
	const pathMatch = worktree.path.match(POLECAT_PATH_SEGMENT_RE);
	return pathMatch?.[1] ?? null;
}

/** Exposed for tests that need to poke the regex behavior. */
export const __internal = { POLECAT_BRANCH_RE, POLECAT_PATH_SEGMENT_RE };
