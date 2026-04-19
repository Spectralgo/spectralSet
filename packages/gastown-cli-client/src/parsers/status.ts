import type { Rig } from "../types";

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
		rigs.push({
			name,
			witnessRunning: entry.has_witness === true,
			refineryRunning: entry.has_refinery === true,
			polecatCount: toNonNegativeInt(entry.polecat_count),
			crewCount: toNonNegativeInt(entry.crew_count),
		});
	}

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
