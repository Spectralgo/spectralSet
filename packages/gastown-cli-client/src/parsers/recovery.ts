import { z } from "zod";
import type { RecoveryCheck, RecoveryStatus } from "../types";

export class RecoveryParseError extends Error {
	readonly stdout: string;

	constructor(message: string, stdout: string) {
		super(message);
		this.name = "RecoveryParseError";
		this.stdout = stdout;
	}
}

const rawSchema = z.object({
	rig: z.string(),
	polecat: z.string(),
	cleanup_status: z.string().default(""),
	needs_recovery: z.boolean().default(false),
	verdict: z.string().default(""),
	branch: z.string().optional(),
	issue: z.string().optional(),
});

export function parseRecovery(stdout: string): RecoveryCheck {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		throw new RecoveryParseError(
			"gt polecat check-recovery did not return JSON",
			stdout,
		);
	}

	const result = rawSchema.safeParse(parsed);
	if (!result.success) {
		throw new RecoveryParseError(
			`gt polecat check-recovery JSON missing expected fields: ${result.error.message}`,
			stdout,
		);
	}

	const status: RecoveryStatus = {
		rig: result.data.rig,
		polecat: result.data.polecat,
		cleanupStatus: result.data.cleanup_status,
		needsRecovery: result.data.needs_recovery,
		verdict: result.data.verdict,
		branch: result.data.branch,
		issue: result.data.issue,
	};

	const canNuke = status.verdict === "SAFE_TO_NUKE";
	const suggestions = deriveBlockers(status);
	const reason = suggestions.length > 0 ? suggestions.join("; ") : undefined;

	return {
		status,
		canNuke,
		reason,
		suggestions: suggestions.length > 0 ? suggestions : undefined,
	};
}

function deriveBlockers(status: RecoveryStatus): string[] {
	if (status.verdict === "SAFE_TO_NUKE") return [];
	const blockers: string[] = [];
	if (status.cleanupStatus === "has_uncommitted") {
		blockers.push("has uncommitted changes");
	} else if (status.cleanupStatus === "has_unpushed") {
		blockers.push("has unpushed commits");
	} else if (status.cleanupStatus === "") {
		blockers.push("cleanup status unknown");
	} else if (status.cleanupStatus !== "clean") {
		blockers.push(`cleanup: ${status.cleanupStatus}`);
	}
	if (status.issue) {
		blockers.push(`has work on hook (${status.issue})`);
	}
	if (blockers.length === 0) {
		if (status.verdict === "NEEDS_MQ_SUBMIT") {
			blockers.push("work not submitted to merge queue");
		} else if (status.verdict === "NEEDS_RECOVERY") {
			blockers.push("needs recovery");
		}
	}
	return blockers;
}
