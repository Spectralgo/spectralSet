export class NukeParseError extends Error {
	readonly stdout: string;

	constructor(message: string, stdout: string) {
		super(message);
		this.name = "NukeParseError";
		this.stdout = stdout;
	}
}

export class NukeSafetyError extends Error {
	readonly reasons: string[];
	readonly stderr: string;
	readonly stdout: string;

	constructor(params: { reasons: string[]; stderr: string; stdout: string }) {
		super(
			`gt polecat nuke refused: ${
				params.reasons.length > 0
					? params.reasons.join("; ")
					: "safety checks failed"
			}`,
		);
		this.name = "NukeSafetyError";
		this.reasons = params.reasons;
		this.stderr = params.stderr;
		this.stdout = params.stdout;
	}
}

export interface ParsedNukeSuccess {
	nukedCount: number;
	closedBead?: string;
}

const NUKED_COUNT_RE = /Nuked\s+(\d+)\s+polecat\(s\)/u;
const CLOSED_BEAD_RE = /Closed\s+agent\s+bead:\s+([A-Za-z0-9_-]+)/iu;

export function parseNukeSuccess(stdout: string): ParsedNukeSuccess {
	const countMatch = stdout.match(NUKED_COUNT_RE);
	const countStr = countMatch?.[1];
	if (!countStr) {
		throw new NukeParseError(
			"Could not find 'Nuked N polecat(s)' success marker in gt output",
			stdout,
		);
	}
	const count = Number.parseInt(countStr, 10);
	if (!Number.isFinite(count)) {
		throw new NukeParseError(`Invalid Nuked count: ${countStr}`, stdout);
	}
	const closedBead = stdout.match(CLOSED_BEAD_RE)?.[1];
	return { nukedCount: count, closedBead };
}

export function isNukeSafetyFailure(stderr: string): boolean {
	return stderr.includes("Safety checks failed");
}

const SAFETY_REASON_RE = /^ {4}-\s+(.+?)\s*$/gmu;

export function parseNukeSafetyReasons(stderr: string): string[] {
	const reasons: string[] = [];
	for (const match of stderr.matchAll(SAFETY_REASON_RE)) {
		const reason = match[1];
		if (reason) reasons.push(reason);
	}
	return reasons;
}
