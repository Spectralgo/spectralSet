import type { TerminalPreset } from "@spectralset/local-db";

/**
 * Stable id for the auto-seeded Mayor terminal preset. External beads
 * (B: auto-reconcile, C: per-polecat attach) rely on this exact value —
 * do not rename without updating callers.
 */
export const MAYOR_PRESET_ID = "gastown.mayor";

/**
 * Pure helper — returns the presets array with the Mayor preset ensured.
 * If a preset with id MAYOR_PRESET_ID already exists the array is
 * returned unchanged (idempotent on re-enable).
 *
 * Split out of ensure-project.ts so tests can import it without
 * dragging in the electron-main localDb module.
 */
export function upsertMayorPreset(opts: {
	presets: TerminalPreset[];
	projectId: string;
	townRoot: string;
	tmuxSocket: string | null;
}): { presets: TerminalPreset[]; changed: boolean } {
	const { presets, projectId, townRoot, tmuxSocket } = opts;
	if (presets.some((p) => p.id === MAYOR_PRESET_ID)) {
		return { presets, changed: false };
	}
	const command = tmuxSocket
		? `tmux -L ${tmuxSocket} attach-session -t hq-mayor`
		: "tmux attach-session -t hq-mayor";
	const mayorPreset: TerminalPreset = {
		id: MAYOR_PRESET_ID,
		name: "Mayor terminal",
		description: "Auto-attaches to the Gas Town Mayor's tmux session.",
		cwd: townRoot,
		commands: [command],
		projectIds: [projectId],
		pinnedToBar: true,
		applyOnWorkspaceCreated: true,
		applyOnNewTab: false,
		executionMode: "new-tab",
	};
	return { presets: [...presets, mayorPreset], changed: true };
}
