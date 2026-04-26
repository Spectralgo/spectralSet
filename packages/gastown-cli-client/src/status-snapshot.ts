import { parseAgentSummariesFromStatusJson } from "./agents";
import {
	type ExecGtDeps,
	type ExecGtOptions,
	execGt,
	GastownCliNotInstalledError,
} from "./exec";
import { parseStatus, StatusParseError } from "./parsers/status";
import { parseVersion } from "./parsers/version";
import type { AgentSummary, ProbeResult } from "./types";

export interface ReadStatusSnapshotArgs {
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export interface StatusSnapshot {
	probe: ProbeResult;
	agents: AgentSummary[];
}

const EMPTY_PROBE: ProbeResult = {
	installed: false,
	version: null,
	townRoot: null,
	townName: null,
	rigs: [],
	daemonRunning: false,
	doltRunning: false,
	tmuxSocket: null,
};

function resolveTownCwd(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	return townRoot ?? process.env.GT_TOWN_ROOT ?? explicitCwd ?? undefined;
}

async function versionFallback(
	options: ExecGtOptions,
	deps: ExecGtDeps,
): Promise<ProbeResult> {
	try {
		const { stdout, exitCode } = await execGt(["--version"], options, deps);
		if (exitCode !== 0) return { ...EMPTY_PROBE };
		return {
			...EMPTY_PROBE,
			installed: true,
			version: parseVersion(stdout),
		};
	} catch (err) {
		if (err instanceof GastownCliNotInstalledError) {
			return { ...EMPTY_PROBE };
		}
		throw err;
	}
}

/**
 * Reads `gt status --json --fast` once and derives both the probe result and
 * the flattened agent roster from the same stdout. Use this on UI surfaces
 * that need probe metadata and agent state together.
 */
export async function readStatusSnapshot(
	args: ReadStatusSnapshotArgs = {},
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<StatusSnapshot> {
	const argv = ["status", "--json", "--fast"];
	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	let statusStdout = "";
	let statusExit = -1;

	try {
		const result = await execGt(
			argv,
			{ ...options, cwd, readOnly: true },
			deps,
		);
		statusStdout = result.stdout;
		statusExit = result.exitCode;
	} catch (err) {
		if (err instanceof GastownCliNotInstalledError) {
			return { probe: { ...EMPTY_PROBE }, agents: [] };
		}
		throw err;
	}

	if (statusExit === 0) {
		try {
			const parsed = parseStatus(statusStdout);
			return {
				probe: {
					installed: true,
					version: null,
					townRoot: parsed.townRoot,
					townName: parsed.townName,
					rigs: parsed.rigs,
					daemonRunning: parsed.daemonRunning,
					doltRunning: parsed.doltRunning,
					tmuxSocket: null,
				},
				agents: parseAgentSummariesFromStatusJson(statusStdout),
			};
		} catch (err) {
			if (!(err instanceof StatusParseError)) throw err;
		}
	}

	return {
		probe: await versionFallback(options, deps),
		agents: [],
	};
}
