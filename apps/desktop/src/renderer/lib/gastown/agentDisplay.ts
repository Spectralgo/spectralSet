import type { AgentState, RigAgent } from "@spectralset/gastown-cli-client";

// Mirrors ClaudePolecatLiveness in main/gastown/claude-session-watcher.
// Defined locally so the renderer doesn't import from main/.
export type ClaudePolecatLiveness =
	| "working"
	| "idle"
	| "budget-locked"
	| "missing";

export type DotColor = "green" | "amber" | "red" | "gray";

export const DOT_CLASS: Record<DotColor, string> = {
	green: "bg-emerald-500",
	amber: "bg-amber-500",
	red: "bg-red-500",
	gray: "bg-neutral-500",
};

interface ProbeAgent {
	running: boolean;
	state: AgentState | null;
}

// Single source of truth for state→label/dot. Prefers JSONL-derived
// liveness when available; otherwise falls back to gt's reported state.
// This closes the doctrine violation in ss-rka0 (sidebar showing 'idle'
// while Claude is mid-tool-call) and unifies the sidebar + Agents pane
// (folds ss-e4zx).
export function resolveDisplay(
	probe: ProbeAgent,
	jsonlState?: ClaudePolecatLiveness,
): { label: string; dotColor: DotColor } {
	const state = jsonlState ?? deriveFromProbe(probe);
	switch (state) {
		case "working":
			return { label: "working", dotColor: "green" };
		case "idle":
			return { label: "idle", dotColor: "amber" };
		case "budget-locked":
			return { label: "budget-locked", dotColor: "red" };
		case "missing":
			return { label: "stopped", dotColor: "gray" };
	}
}

function deriveFromProbe(probe: ProbeAgent): ClaudePolecatLiveness {
	if (!probe.running) return "missing";
	if (probe.state === "working") return "working";
	return "idle";
}

// Derives the Claude `cwd` for an agent using Gas Town's filesystem
// conventions (verified against ~/.claude/projects entries on this host).
// Returns null when the role/rig combination is not derivable, so callers
// can skip the JSONL subscription and fall back to deriveFromProbe.
export function deriveCloneDir(args: {
	townRoot: string | null | undefined;
	role: RigAgent["role"];
	rig: string;
	name: string;
}): string | null {
	const { townRoot, role, rig, name } = args;
	if (!townRoot) return null;
	switch (role) {
		case "mayor":
			return townRoot;
		case "witness":
			return `${townRoot}/${rig}/witness`;
		case "refinery":
			return `${townRoot}/${rig}/refinery/rig`;
		case "crew":
			return `${townRoot}/${rig}/crew/${name}`;
		case "polecat":
			return `${townRoot}/${rig}/polecats/${name}/${rig}`;
	}
}
