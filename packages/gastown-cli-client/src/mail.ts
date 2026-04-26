import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
	type ExecGtDeps,
	type ExecGtOptions,
	execDolt,
	execGt,
	GastownCliError,
} from "./exec";
import {
	type MailMessage,
	type MailPriority,
	type MailSendType,
	mailMessageArraySchema,
	mailTypeSchema,
} from "./types";

const PRIORITY_TO_NUM: Record<MailPriority, string> = {
	urgent: "0",
	high: "1",
	normal: "2",
	low: "3",
	backlog: "4",
};

const NUM_TO_PRIORITY: Record<number, MailPriority> = {
	0: "urgent",
	1: "high",
	2: "normal",
	3: "low",
	4: "backlog",
};

function resolveTownCwd(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	if (explicitCwd) return explicitCwd;
	return townRoot ?? process.env.GT_TOWN_ROOT ?? undefined;
}

function resolveTownRootForDolt(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	const candidates = [townRoot, process.env.GT_TOWN_ROOT, explicitCwd];
	return candidates.find((candidate) => {
		if (!candidate) return false;
		return existsSync(join(candidate, ".dolt-data", "hq"));
	});
}

function escapeSqlString(value: string): string {
	return value.replaceAll("'", "''");
}

const doltMailRowsSchema = z.object({
	rows: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			description: z.string(),
			priority: z.coerce.number().int(),
			created_at: z.string(),
			labels: z.string().nullable().optional(),
		}),
	),
});

type DoltMailRow = z.infer<typeof doltMailRowsSchema>["rows"][number];

function buildDoltListInboxQuery(address: string): string {
	const escapedAddress = escapeSqlString(address);
	return `
select id, title, description, priority, created_at, labels
from (
  select
    'issue' as src,
    i.id,
    i.title,
    i.description,
    i.status,
    i.priority,
    i.created_at,
    group_concat(l.label order by l.label separator '|') as labels
  from issues i
  join labels l on l.issue_id = i.id
  group by i.id, i.title, i.description, i.status, i.priority, i.created_at
  union all
  select
    'wisp' as src,
    w.id,
    w.title,
    w.description,
    w.status,
    w.priority,
    w.created_at,
    group_concat(l.label order by l.label separator '|') as labels
  from wisps w
  join wisp_labels l on l.issue_id = w.id
  group by w.id, w.title, w.description, w.status, w.priority, w.created_at
) m
where status <> 'closed'
  and labels like '%gt:message%'
  and (
    labels like '%delivery-acked-by:${escapedAddress}%'
    or (src = 'issue' and status = 'hooked' and labels like '%from:${escapedAddress}%')
  )
order by priority asc, created_at desc, id asc;
`.trim();
}

function normalizeDoltDate(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toISOString().replace(".000Z", "Z");
}

function splitLabels(value: string | null | undefined): string[] {
	if (!value) return [];
	return value.split("|").filter(Boolean);
}

function findLabelValue(
	labels: readonly string[],
	prefix: string,
): string | null {
	const label = labels.find((item) => item.startsWith(prefix));
	return label ? label.slice(prefix.length) : null;
}

function parseMailType(
	rawType: string | null,
	labels: readonly string[],
): MailMessage["type"] {
	if (rawType === "escalation" || labels.includes("gt:escalation")) {
		return "escalation";
	}

	const parsed = mailTypeSchema.safeParse(rawType);
	return parsed.success ? parsed.data : "notification";
}

function rowToMailMessage(row: DoltMailRow, address: string): MailMessage {
	const labels = splitLabels(row.labels);
	const rawType = findLabelValue(labels, "msg-type:");

	return {
		id: row.id,
		from: findLabelValue(labels, "from:") ?? "",
		to: address,
		subject: row.title,
		body: row.description,
		timestamp: normalizeDoltDate(row.created_at),
		read: labels.includes("read"),
		priority: NUM_TO_PRIORITY[row.priority] ?? "normal",
		type: parseMailType(rawType, labels),
	};
}

async function listInboxFromDolt(
	args: ListInboxArgs,
	options: ExecGtOptions,
	deps: ExecGtDeps,
): Promise<MailMessage[] | null> {
	const { address } = args;
	if (!address) return null;
	const townRoot = resolveTownRootForDolt(args.townRoot, options.cwd);
	if (!townRoot) return null;

	const hqDoltDir = join(townRoot, ".dolt-data", "hq");
	const query = buildDoltListInboxQuery(address);
	const { stdout, exitCode } = await execDolt(
		["sql", "-r", "json", "-q", query],
		{ ...options, cwd: hqDoltDir, readOnly: true },
		deps,
	);
	if (exitCode !== 0) return null;

	const parsed = doltMailRowsSchema.parse(JSON.parse(stdout));
	const messages = parsed.rows.map((row) => rowToMailMessage(row, address));
	const filtered = args.unreadOnly
		? messages.filter((message) => !message.read)
		: messages;
	return mailMessageArraySchema.parse(filtered);
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
	try {
		const doltResult = await listInboxFromDolt(args, options, deps);
		if (doltResult) return doltResult;
	} catch {
		// Fall back to the canonical gt implementation if the Dolt layout,
		// schema, or label semantics drift from the fast path.
	}

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
