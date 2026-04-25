import type { Rig, RigAgent } from "../types";

const KNOWN_ROLES = new Set([
	"mayor",
	"polecat",
	"refinery",
	"witness",
	"crew",
]);
const KNOWN_STATES = new Set([
	"working",
	"idle",
	"done",
	"stalled",
	"zombie",
	"nuked",
]);

export class StatusParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StatusParseError";
	}
}

export interface ParsedStatus {
	townName: string | null;
	townRoot: string | null;
	daemonRunning: boolean;
	doltRunning: boolean;
	rigs: Rig[];
}

export function parseStatus(stdout: string): ParsedStatus {
	let raw: unknown;
	try {
		raw = JSON.parse(stdout);
	} catch (err) {
		throw new StatusParseError(
			`gt status --json returned non-JSON: ${(err as Error).message}`,
		);
	}
	if (!isRecord(raw)) {
		throw new StatusParseError("gt status --json must return an object");
	}

	const townName = typeof raw.name === "string" ? raw.name : null;
	const townRoot = typeof raw.location === "string" ? raw.location : null;
	const daemonRunning = isRecord(raw.daemon) && raw.daemon.running === true;
	const doltRunning = isRecord(raw.dolt) && raw.dolt.running === true;

	const rigsInput = Array.isArray(raw.rigs) ? raw.rigs : [];
	const rigs: Rig[] = [];
	for (const entry of rigsInput) {
		if (!isRecord(entry)) continue;
		const name = typeof entry.name === "string" ? entry.name : null;
		if (!name) continue;
		const agentsInput = Array.isArray(entry.agents) ? entry.agents : [];
		const agents: RigAgent[] = [];
		for (const a of agentsInput) {
			if (!isRecord(a)) continue;
			const agentName = typeof a.name === "string" ? a.name : null;
			const role = KNOWN_ROLES.has(a.role as string)
				? (a.role as RigAgent["role"])
				: null;
			if (!agentName || !role) continue;
			const session = typeof a.session === "string" ? a.session : null;
			const state = KNOWN_STATES.has(a.state as string)
				? (a.state as RigAgent["state"])
				: null;
			const running = a.running === true;
			agents.push({
				rig: name,
				name: agentName,
				role,
				session,
				state,
				running,
			});
		}
		rigs.push({
			name,
			witnessRunning: entry.has_witness === true,
			refineryRunning: entry.has_refinery === true,
			polecatCount: toNonNegativeInt(entry.polecat_count),
			crewCount: toNonNegativeInt(entry.crew_count),
			agents,
		});
	}

	rigs.sort((a, b) => a.name.localeCompare(b.name));

	return { townName, townRoot, daemonRunning, doltRunning, rigs };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNonNegativeInt(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 0;
	const n = Math.floor(value);
	return n < 0 ? 0 : n;
}
