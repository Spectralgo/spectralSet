import {
	type ExecGtDeps,
	type ExecGtOptions,
	execBd,
	execGt,
	GastownCliError,
} from "./exec";
import { getRigPrefix } from "./rig-prefix";
import {
	type AgentDetail,
	type AgentKind,
	type AgentState,
	type AgentSummary,
	agentDetailSchema,
} from "./types";

const KNOWN_STATES = new Set<AgentState>([
	"idle",
	"working",
	"stalled",
	"zombie",
	"done",
	"nuked",
]);

const RIG_ROLE_TO_KIND: Record<string, AgentKind> = {
	polecat: "polecat",
	crew: "crew",
	witness: "witness",
	refinery: "refinery",
};

const TOP_NAME_TO_KIND: Record<string, AgentKind> = {
	mayor: "mayor",
	deacon: "deacon",
	boot: "boot",
};

function resolveTownCwd(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	if (explicitCwd) return explicitCwd;
	return townRoot ?? process.env.GT_TOWN_ROOT ?? undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceState(value: unknown): AgentState {
	return typeof value === "string" && KNOWN_STATES.has(value as AgentState)
		? (value as AgentState)
		: "idle";
}

function toSummary(
	entry: Record<string, unknown>,
	kind: AgentKind,
	rig: string | null,
): AgentSummary | null {
	const name = typeof entry.name === "string" ? entry.name : null;
	if (!name) return null;
	const address =
		typeof entry.address === "string"
			? entry.address
			: rig
				? `${rig}/${name}`
				: `${name}/`;
	const session = typeof entry.session === "string" ? entry.session : "";
	const role = typeof entry.role === "string" ? entry.role : kind;
	const running = entry.running === true;
	const unread =
		typeof entry.unread_mail === "number" && entry.unread_mail >= 0
			? Math.floor(entry.unread_mail)
			: 0;
	const firstSubject =
		typeof entry.first_subject === "string" ? entry.first_subject : null;
	return {
		kind,
		name,
		address,
		session,
		role,
		rig,
		running,
		state: coerceState(entry.state),
		unreadMail: unread,
		firstSubject,
	};
}

export interface ListAgentsArgs {
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

/**
 * Flattens `gt status --json` into a single list of agents.
 * - Top-level `agents[]` (mayor/deacon/boot) are inferred from the agent name.
 * - Rig-scoped agents from `rigs[].agents[]` inherit their rig name and
 *   their role directly maps to the kind (polecat/crew/witness/refinery).
 */
export async function listAgents(
	args: ListAgentsArgs = {},
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<AgentSummary[]> {
	const argv = ["status", "--json"];
	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}

	let raw: unknown;
	try {
		raw = JSON.parse(stdout);
	} catch {
		return [];
	}
	if (!isRecord(raw)) return [];

	const results: AgentSummary[] = [];

	const topAgents = Array.isArray(raw.agents) ? raw.agents : [];
	for (const entry of topAgents) {
		if (!isRecord(entry)) continue;
		const name = typeof entry.name === "string" ? entry.name : null;
		if (!name) continue;
		const kind = TOP_NAME_TO_KIND[name];
		if (!kind) continue;
		const summary = toSummary(entry, kind, null);
		if (summary) results.push(summary);
	}

	const rigs = Array.isArray(raw.rigs) ? raw.rigs : [];
	for (const rigEntry of rigs) {
		if (!isRecord(rigEntry)) continue;
		const rigName = typeof rigEntry.name === "string" ? rigEntry.name : null;
		if (!rigName) continue;
		const agents = Array.isArray(rigEntry.agents) ? rigEntry.agents : [];
		for (const entry of agents) {
			if (!isRecord(entry)) continue;
			const role = typeof entry.role === "string" ? entry.role : null;
			const kind = role ? RIG_ROLE_TO_KIND[role] : undefined;
			if (!kind) continue;
			const summary = toSummary(entry, kind, rigName);
			if (summary) results.push(summary);
		}
	}

	return results;
}

export interface GetAgentArgs {
	kind: AgentKind;
	/** Required for rig-scoped kinds (polecat/crew/witness/refinery). */
	rig?: string;
	name: string;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

/**
 * Returns the rig-scoped agent bead id for a kind, mirroring the naming
 * convention gt uses when it creates agent beads
 * (e.g. `ss-spectralSet-polecat-jasper`). Top-level kinds (mayor/deacon/boot)
 * and any kind without a rig return null — there is no bead to fetch.
 */
function deriveAgentBeadId(
	kind: AgentKind,
	rig: string | null,
	name: string,
): string | null {
	if (!rig) return null;
	const prefix = getRigPrefix(rig);
	switch (kind) {
		case "polecat":
			return `${prefix}-${rig}-polecat-${name}`;
		case "crew":
			return `${prefix}-${rig}-crew-${name}`;
		case "witness":
			return `${prefix}-${rig}-witness`;
		case "refinery":
			return `${prefix}-${rig}-refinery`;
		default:
			return null;
	}
}

/**
 * Parses `key: value` lines out of an agent bead's description. Values of
 * the literal string "null" become null. Unknown keys are ignored — the
 * shape of agent-bead metadata can drift over time without breaking callers.
 */
function parseAgentMetadata(
	description: string,
): Record<string, string | null> {
	const out: Record<string, string | null> = {};
	for (const rawLine of description.split("\n")) {
		const line = rawLine.trim();
		if (!line || !line.includes(":")) continue;
		const idx = line.indexOf(":");
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		if (!key || key.includes(" ")) continue;
		out[key] = value === "null" || value === "" ? null : value;
	}
	return out;
}

export async function getAgent(
	args: GetAgentArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<AgentDetail> {
	const summaries = await listAgents(
		{ townRoot: args.townRoot },
		options,
		deps,
	);
	const match = summaries.find(
		(a) =>
			a.kind === args.kind &&
			a.name === args.name &&
			(args.rig ? a.rig === args.rig : a.rig === null),
	);
	if (!match) {
		throw new Error(
			`agent not found: kind=${args.kind} rig=${args.rig ?? "<town>"} name=${args.name}`,
		);
	}

	const agentBeadId = deriveAgentBeadId(args.kind, match.rig, match.name);

	let hookBead: string | null = null;
	let activeMr: string | null = null;
	let branch: string | null = null;
	let cleanupStatus: string | null = null;
	let exitType: string | null = null;
	let completionTime: string | null = null;

	if (agentBeadId) {
		try {
			const cwd = resolveTownCwd(args.townRoot, options.cwd);
			const { stdout, exitCode } = await execBd(
				["show", agentBeadId, "--json"],
				{ ...options, cwd },
				deps,
			);
			if (exitCode === 0) {
				const parsed = JSON.parse(stdout);
				const bead = Array.isArray(parsed) ? parsed[0] : parsed;
				if (isRecord(bead) && typeof bead.description === "string") {
					const meta = parseAgentMetadata(bead.description);
					hookBead = meta.hook_bead ?? null;
					activeMr = meta.active_mr ?? null;
					branch = meta.branch ?? null;
					cleanupStatus = meta.cleanup_status ?? null;
					exitType = meta.exit_type ?? null;
					completionTime = meta.completion_time ?? null;
				}
			}
		} catch {
			// Best-effort — missing beads, bd unavailable, or JSON drift
			// should not poison the summary we already have.
		}
	}

	return agentDetailSchema.parse({
		...match,
		agentBeadId,
		hookBead,
		activeMr,
		branch,
		cleanupStatus,
		exitType,
		completionTime,
		// TODO: derive recentCompletions by scanning closed beads authored
		// by this agent. Deferred — not blocking the CV panel UI.
		recentCompletions: [],
	});
}
