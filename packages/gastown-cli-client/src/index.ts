import {
	type ExecGtDeps,
	type ExecGtOptions,
	execGt,
	GastownCliError,
	GastownCliNotInstalledError,
} from "./exec";
import { parsePeek } from "./parsers/peek";
import { parsePolecatList } from "./parsers/polecats";
import { parseRigList } from "./parsers/rigs";
import { parseVersion } from "./parsers/version";
import type { PeekResult, Polecat, ProbeResult, Rig } from "./types";

export {
	GastownCliError,
	GastownCliNotInstalledError,
	GastownCliTimeoutError,
} from "./exec";
export type {
	PeekResult,
	Polecat,
	PolecatState,
	ProbeResult,
	Rig,
} from "./types";

export interface GastownCliClientOptions extends ExecGtOptions {}

export async function probe(
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<ProbeResult> {
	try {
		const { stdout, exitCode, stderr } = await execGt(
			["--version"],
			options,
			deps,
		);
		if (exitCode !== 0) {
			throw new GastownCliError({
				argv: ["--version"],
				exitCode,
				stdout,
				stderr,
			});
		}
		return { installed: true, version: parseVersion(stdout) };
	} catch (err) {
		if (err instanceof GastownCliNotInstalledError) {
			return { installed: false, version: null };
		}
		throw err;
	}
}

export async function listRigs(
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<Rig[]> {
	const { stdout, stderr, exitCode } = await execGt(
		["rig", "list"],
		options,
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({
			argv: ["rig", "list"],
			exitCode,
			stdout,
			stderr,
		});
	}
	return parseRigList(stdout);
}

export interface ListPolecatsArgs {
	rig?: string;
}

export async function listPolecats(
	args: ListPolecatsArgs = {},
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<Polecat[]> {
	const argv = args.rig
		? ["polecat", "list", args.rig]
		: ["polecat", "list", "--all"];
	const { stdout, stderr, exitCode } = await execGt(argv, options, deps);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return parsePolecatList(stdout);
}

export interface PeekArgs {
	rig: string;
	polecat: string;
	lines?: number;
}

const DEFAULT_PEEK_LINES = 30;

export async function peek(
	args: PeekArgs,
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<PeekResult> {
	const target = `${args.rig}/${args.polecat}`;
	const lines = args.lines ?? DEFAULT_PEEK_LINES;
	const argv = ["peek", target, "-n", String(lines)];
	const { stdout, stderr, exitCode } = await execGt(argv, options, deps);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return parsePeek(stdout);
}
