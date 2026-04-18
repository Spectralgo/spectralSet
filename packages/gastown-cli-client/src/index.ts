import {
	type ExecGtDeps,
	type ExecGtOptions,
	execBd,
	execGt,
	GastownCliError,
	GastownCliNotInstalledError,
} from "./exec";
import { parseBeadList } from "./parsers/beads";
import { parsePeek } from "./parsers/peek";
import { parsePolecatList } from "./parsers/polecats";
import { parseRigList } from "./parsers/rigs";
import { parseSlingResult } from "./parsers/sling";
import { parseVersion } from "./parsers/version";
import type {
	Bead,
	MergeStrategy,
	PeekResult,
	Polecat,
	ProbeResult,
	Rig,
	SlingResult,
} from "./types";

export {
	GastownCliError,
	GastownCliNotInstalledError,
	GastownCliTimeoutError,
} from "./exec";
export { SlingParseError } from "./parsers/sling";
export type {
	Bead,
	BeadStatus,
	MergeStrategy,
	PeekResult,
	Polecat,
	PolecatState,
	ProbeResult,
	Rig,
	SlingResult,
} from "./types";
export {
	beadSchema,
	beadStatusSchema,
	mergeStrategySchema,
	slingResultSchema,
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

export interface ListBeadsArgs {
	rig: string;
	status?: "open" | "closed" | "in_progress";
	limit?: number;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	gastownRoot?: string;
}

const DEFAULT_BEADS_LIMIT = 100;

export async function listBeads(
	args: ListBeadsArgs,
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<Bead[]> {
	const argv = ["list", "--json", "--no-pager"];
	if (args.status) argv.push("--status", args.status);
	argv.push("-n", String(args.limit ?? DEFAULT_BEADS_LIMIT));

	const rigCwd = resolveRigCwd(args.rig, args.gastownRoot, options.cwd);

	const { stdout, stderr, exitCode } = await execBd(
		argv,
		{ ...options, cwd: rigCwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return parseBeadList(stdout);
}

export interface SlingArgs {
	rig: string;
	bead: string;
	mergeStrategy: MergeStrategy;
	notes?: string;
}

export async function sling(
	args: SlingArgs,
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<SlingResult> {
	const argv = [
		"sling",
		args.bead,
		args.rig,
		"--merge",
		args.mergeStrategy,
		"--no-convoy",
		"--create",
	];
	const execOptions: ExecGtOptions = { ...options };
	if (args.notes && args.notes.trim().length > 0) {
		argv.push("--stdin");
		execOptions.stdin = args.notes;
	}

	const { stdout, stderr, exitCode } = await execGt(argv, execOptions, deps);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return parseSlingResult(stdout);
}

function resolveRigCwd(
	rig: string,
	gastownRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	if (explicitCwd) return explicitCwd;
	const root = gastownRoot ?? process.env.GT_TOWN_ROOT;
	if (!root) return undefined;
	return `${root}/${rig}`;
}
