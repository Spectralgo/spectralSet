import {
	type ExecGtDeps,
	type ExecGtOptions,
	execBd,
	execGit,
	execGt,
	GastownCliError,
	GastownCliNotInstalledError,
} from "./exec";
import { parseBeadList } from "./parsers/beads";
import {
	isNukeSafetyFailure,
	NukeSafetyError,
	parseNukeSafetyReasons,
	parseNukeSuccess,
} from "./parsers/nuke";
import { parsePeek } from "./parsers/peek";
import { parsePolecatList } from "./parsers/polecats";
import { parseRecovery } from "./parsers/recovery";
import { parseRigList } from "./parsers/rigs";
import { parseSlingResult } from "./parsers/sling";
import { parseStatus, StatusParseError } from "./parsers/status";
import { parseVersion } from "./parsers/version";
import { parseWorktreeList } from "./parsers/worktrees";
import type {
	Bead,
	MergeStrategy,
	NukeResult,
	PeekResult,
	Polecat,
	ProbeResult,
	RecoveryCheck,
	Rig,
	SlingResult,
	Worktree,
} from "./types";

export {
	type GetAgentArgs,
	getAgent,
	type ListAgentsArgs,
	listAgents,
} from "./agents";
export {
	type ConvoyStatusArgs,
	convoyStatus,
	type ListConvoysArgs,
	listConvoys,
} from "./convoys";
export {
	expandTilde,
	GastownCliError,
	GastownCliNotInstalledError,
	GastownCliTimeoutError,
} from "./exec";
export {
	type ArchiveMailArgs,
	archiveMessage,
	type ListInboxArgs,
	listInbox,
	type MarkMailReadArgs,
	markMessageRead,
	type ReadMailArgs,
	readMessage,
	type SendMailArgs,
	sendMail,
} from "./mail";
export {
	NukeParseError,
	NukeSafetyError,
} from "./parsers/nuke";
export { RecoveryParseError } from "./parsers/recovery";
export { SlingParseError } from "./parsers/sling";
export { StatusParseError } from "./parsers/status";
export { getRigPrefix } from "./rig-prefix";
export type {
	AgentDetail,
	AgentKind,
	AgentState,
	AgentSummary,
	Bead,
	BeadStatus,
	Convoy,
	ConvoyStatus,
	ConvoyTracked,
	MailMessage,
	MailPriority,
	MailSendType,
	MailType,
	MergeStrategy,
	NukeResult,
	PeekResult,
	Polecat,
	PolecatState,
	ProbeResult,
	RecoveryCheck,
	RecoveryStatus,
	Rig,
	RigAgent,
	SlingResult,
	Worktree,
} from "./types";
export {
	agentDetailSchema,
	agentKindSchema,
	agentStateSchema,
	agentSummarySchema,
	beadSchema,
	beadStatusSchema,
	convoyArraySchema,
	convoySchema,
	convoyStatusSchema,
	convoyTrackedSchema,
	mailMessageArraySchema,
	mailMessageSchema,
	mailPrioritySchema,
	mailSendTypeSchema,
	mailTypeSchema,
	mergeStrategySchema,
	nukeResultSchema,
	recoveryCheckSchema,
	recoveryStatusSchema,
	rigAgentSchema,
	slingResultSchema,
	worktreeSchema,
} from "./types";

export interface GastownCliClientOptions extends ExecGtOptions {}

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

export async function probe(
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<ProbeResult> {
	let statusStdout = "";
	let statusExit = -1;
	try {
		const result = await execGt(["status", "--json"], options, deps);
		statusStdout = result.stdout;
		statusExit = result.exitCode;
	} catch (err) {
		if (err instanceof GastownCliNotInstalledError) {
			return { ...EMPTY_PROBE };
		}
		throw err;
	}

	if (statusExit === 0) {
		try {
			const parsed = parseStatus(statusStdout);
			return {
				installed: true,
				version: null,
				townRoot: parsed.townRoot,
				townName: parsed.townName,
				rigs: parsed.rigs,
				daemonRunning: parsed.daemonRunning,
				doltRunning: parsed.doltRunning,
				tmuxSocket: null,
			};
		} catch (err) {
			if (!(err instanceof StatusParseError)) throw err;
			// Fall through to version fallback.
		}
	}

	// Fallback: gt present but town not initialized, or legacy install.
	try {
		const { stdout, exitCode } = await execGt(["--version"], options, deps);
		if (exitCode !== 0) {
			return { ...EMPTY_PROBE };
		}
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

export interface ListRigsArgs {
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function listRigs(
	args: ListRigsArgs = {},
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<Rig[]> {
	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		["rig", "list"],
		{ ...options, cwd },
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
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function listPolecats(
	args: ListPolecatsArgs = {},
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<Polecat[]> {
	const argv = args.rig
		? ["polecat", "list", args.rig]
		: ["polecat", "list", "--all"];
	const cwd = args.rig
		? resolveRigCwd(args.rig, args.townRoot, options.cwd)
		: resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return parsePolecatList(stdout);
}

export interface PeekArgs {
	rig: string;
	polecat: string;
	lines?: number;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
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
	const cwd = resolveRigCwd(args.rig, args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
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
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
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
	const cwd = resolveRigCwd(args.rig, args.townRoot, options.cwd);
	const execOptions: ExecGtOptions = { ...options, cwd };
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

export interface CheckRecoveryArgs {
	rig: string;
	polecat: string;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function checkRecovery(
	args: CheckRecoveryArgs,
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<RecoveryCheck> {
	const target = `${args.rig}/${args.polecat}`;
	const argv = ["polecat", "check-recovery", target, "--json"];
	const cwd = resolveRigCwd(args.rig, args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return parseRecovery(stdout);
}

export interface NudgeArgs {
	rig: string;
	polecat: string;
	message: string;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

/**
 * Sends a message to a polecat's Claude session via `gt nudge`.
 * The message is passed over stdin so it can contain newlines, quotes,
 * and shell metacharacters without escaping.
 */
export async function nudge(
	args: NudgeArgs,
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<void> {
	const target = `${args.rig}/${args.polecat}`;
	const argv = ["nudge", target, "--stdin"];
	const cwd = resolveRigCwd(args.rig, args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd, stdin: args.message },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
}

export interface NukeArgs {
	rig: string;
	polecat: string;
	force?: boolean;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function nuke(
	args: NukeArgs,
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<NukeResult> {
	const target = `${args.rig}/${args.polecat}`;
	const argv = ["polecat", "nuke", target];
	if (args.force) argv.push("--force");
	const cwd = resolveRigCwd(args.rig, args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		if (isNukeSafetyFailure(stderr)) {
			throw new NukeSafetyError({
				reasons: parseNukeSafetyReasons(stderr),
				stderr,
				stdout,
			});
		}
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	const parsed = parseNukeSuccess(stdout);
	return { ok: true, closedBead: parsed.closedBead };
}

export interface ListWorktreesArgs {
	rig: string;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

/**
 * Lists git worktrees attached to the rig's shared bare repo at
 * `<town>/<rig>/.repo.git`. Returns every polecat sandbox, the
 * refinery checkout, and the bare itself. Used by the SpectralSet ×
 * Gas Town worktree bridge to discover polecat workspaces.
 */
export async function listWorktrees(
	args: ListWorktreesArgs,
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<Worktree[]> {
	const cwd = resolveRigCwd(args.rig, args.townRoot, options.cwd);
	const argv = ["-C", ".repo.git", "worktree", "list", "--porcelain"];
	const { stdout, stderr, exitCode } = await execGit(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return parseWorktreeList(stdout);
}

export function resolveRigCwd(
	rig: string,
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	const root = townRoot ?? process.env.GT_TOWN_ROOT;
	if (root) return `${root}/${rig}`;
	return explicitCwd ?? undefined;
}

export function resolveTownCwd(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	return townRoot ?? process.env.GT_TOWN_ROOT ?? explicitCwd ?? undefined;
}
