/**
 * Opens (or re-focuses) a terminal tab attached to an agent's tmux
 * session. Called from the Gas Town sidebar when the user clicks an
 * agent row. Pure async helper — React/store coupling is injected
 * by the caller via the `deps` bundle, mirroring
 * `bootstrapOpenWorktree`.
 */

import type { AgentKind } from "@spectralset/gastown-cli-client";

export interface AttachToAgentOptions {
	rig: string;
	polecat: string;
	/** Agent kind — routes the tmux session name (polecat vs crew vs witness etc.). */
	kind: AgentKind;
	/** Rig's bead prefix (e.g. "ss" for spectralSet). Used in the tmux session name. */
	rigPrefix: string;
	/** Tmux socket name from `gastown.probe` (e.g. "spectralgastown-a292c7"). */
	tmuxSocket: string;
	/** Active workspace where a new tab should open if none exists. */
	workspaceId: string;
	/** Optional polecat state ("working", "idle", …) used only for tab title. */
	state?: string;
	/** Worktree path to seed the pane's initialCwd. Falls back to $HOME. */
	cwd?: string;
}

export interface AttachToAgentExistingTab {
	tabId: string;
	paneId: string;
}

export interface AttachToAgentDeps {
	findExistingAttachTab: (input: {
		rig: string;
		polecat: string;
		rigPrefix: string;
	}) => AttachToAgentExistingTab | null;
	activateTab: (tabId: string) => void;
	addTab: (workspaceId: string) => { tabId: string; paneId: string };
	setTabTitle: (tabId: string, title: string) => void;
	createOrAttach: (input: {
		paneId: string;
		tabId: string;
		workspaceId: string;
		cwd?: string;
		joinPending?: boolean;
	}) => Promise<unknown>;
	writeToTerminal: (input: {
		paneId: string;
		data: string;
		throwOnError?: boolean;
	}) => Promise<unknown>;
}

export type AttachToAgentOutcome = "focused-existing" | "created-new";

export interface AttachToAgentResult {
	outcome: AttachToAgentOutcome;
	tabId: string;
	paneId: string;
}

export function buildTmuxSessionName(
	rigPrefix: string,
	kind: AgentKind,
	name: string,
): string {
	switch (kind) {
		case "mayor":
		case "deacon":
		case "boot":
			return `hq-${kind}`;
		case "witness":
		case "refinery":
			return `${rigPrefix}-${kind}`;
		case "crew":
			return `${rigPrefix}-crew-${name}`;
		case "polecat":
			return `${rigPrefix}-${name}`;
	}
}

export function buildTmuxAttachCommand(
	tmuxSocket: string,
	sessionName: string,
): string {
	return `tmux -L ${tmuxSocket} attach-session -t ${sessionName}`;
}

export function buildAttachTabTitle(polecat: string, state?: string): string {
	return state ? `${polecat} • ${state}` : polecat;
}

export async function attachToAgent(
	opts: AttachToAgentOptions,
	deps: AttachToAgentDeps,
): Promise<AttachToAgentResult> {
	const existing = deps.findExistingAttachTab({
		rig: opts.rig,
		polecat: opts.polecat,
		rigPrefix: opts.rigPrefix,
	});
	if (existing) {
		deps.activateTab(existing.tabId);
		return {
			outcome: "focused-existing",
			tabId: existing.tabId,
			paneId: existing.paneId,
		};
	}

	const sessionName = buildTmuxSessionName(
		opts.rigPrefix,
		opts.kind,
		opts.polecat,
	);
	const command = buildTmuxAttachCommand(opts.tmuxSocket, sessionName);
	const title = buildAttachTabTitle(opts.polecat, opts.state);

	const { tabId, paneId } = deps.addTab(opts.workspaceId);
	deps.setTabTitle(tabId, title);

	await deps.createOrAttach({
		paneId,
		tabId,
		workspaceId: opts.workspaceId,
		cwd: opts.cwd,
		joinPending: true,
	});

	await deps.writeToTerminal({
		paneId,
		data: `${command}\n`,
		throwOnError: true,
	});

	return { outcome: "created-new", tabId, paneId };
}
