import {
	type ExecGtDeps,
	type ExecGtOptions,
	execGt,
	GastownCliError,
} from "./exec";
import {
	type MailMessage,
	type MailPriority,
	type MailSendType,
	mailMessageArraySchema,
} from "./types";

const PRIORITY_TO_NUM: Record<MailPriority, string> = {
	urgent: "0",
	high: "1",
	normal: "2",
	low: "3",
	backlog: "4",
};

function resolveTownCwd(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	if (explicitCwd) return explicitCwd;
	return townRoot ?? process.env.GT_TOWN_ROOT ?? undefined;
}

export interface ListInboxArgs {
	/** Target inbox (e.g. "mayor/", "spectralSet/refinery"). Omit → current context. */
	address?: string;
	unreadOnly?: boolean;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function listInbox(
	args: ListInboxArgs = {},
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<MailMessage[]> {
	const argv: string[] = ["mail", "inbox"];
	if (args.address) argv.push(args.address);
	argv.push("--json", args.unreadOnly ? "--unread" : "--all");

	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd, readOnly: true },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return mailMessageArraySchema.parse(JSON.parse(stdout));
}

export interface ReadMailArgs {
	id: string;
	address?: string;
	townRoot?: string;
}

/**
 * Fetches a single mail message by id. `gt mail read` has no --json mode,
 * but `gt mail inbox --json` returns every field needed — so look up by
 * id there instead of doing a second CLI call. Returns null if the id is
 * not present in the addressed inbox.
 */
export async function readMessage(
	args: ReadMailArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<MailMessage | null> {
	const inbox = await listInbox(
		{ address: args.address, townRoot: args.townRoot },
		options,
		deps,
	);
	return inbox.find((msg) => msg.id === args.id) ?? null;
}

export interface SendMailArgs {
	/** Recipient address, e.g. "mayor/", "spectralSet/refinery". */
	to: string;
	subject: string;
	body: string;
	priority?: MailPriority;
	type?: MailSendType;
	pinned?: boolean;
	townRoot?: string;
}

export async function sendMail(
	args: SendMailArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<void> {
	const argv: string[] = [
		"mail",
		"send",
		args.to,
		"-s",
		args.subject,
		"--stdin",
	];
	if (args.pinned) argv.push("--pinned");
	if (args.priority) argv.push("--priority", PRIORITY_TO_NUM[args.priority]);
	if (args.type) argv.push("--type", args.type);

	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd, stdin: args.body },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
}

export interface ArchiveMailArgs {
	ids: string[];
	townRoot?: string;
}

export async function archiveMessage(
	args: ArchiveMailArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<void> {
	if (args.ids.length === 0) return;
	const argv: string[] = ["mail", "archive", ...args.ids];

	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
}

export interface MarkMailReadArgs {
	ids: string[];
	townRoot?: string;
}

export async function markMessageRead(
	args: MarkMailReadArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<void> {
	if (args.ids.length === 0) return;
	const argv: string[] = ["mail", "mark-read", ...args.ids];

	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
}
