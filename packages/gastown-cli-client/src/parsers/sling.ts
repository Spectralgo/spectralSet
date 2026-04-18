import type { SlingResult } from "../types";

const POLECAT_SPAWNED_RE = /Polecat\s+([A-Za-z0-9_-]+)\s+spawned/u;
const POLECAT_REUSED_RE = /Reusing\s+idle\s+polecat:\s+([A-Za-z0-9_-]+)/u;
const WISP_RE = /Formula\s+wisp\s+created:\s+([A-Za-z0-9_-]+)/u;

export class SlingParseError extends Error {
	readonly stdout: string;

	constructor(message: string, stdout: string) {
		super(message);
		this.name = "SlingParseError";
		this.stdout = stdout;
	}
}

export function parseSlingResult(stdout: string): SlingResult {
	const polecat =
		stdout.match(POLECAT_SPAWNED_RE)?.[1] ??
		stdout.match(POLECAT_REUSED_RE)?.[1] ??
		null;

	const wispId = stdout.match(WISP_RE)?.[1] ?? null;

	if (!polecat || !wispId) {
		throw new SlingParseError(
			"Could not parse sling output (missing polecat or wisp id)",
			stdout,
		);
	}

	return { polecat, wispId };
}
