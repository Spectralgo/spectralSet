import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
	type ExecGtDeps,
	type ExecGtOptions,
	execDolt,
	execGt,
	GastownCliError,
} from "./exec";
import {
	type BeadDetail,
	beadDetailSchema,
	type Convoy,
	type ConvoyBead,
	type ConvoyBeadStatus,
	type ConvoyStatus,
	convoyArraySchema,
	convoyStatusSchema,
} from "./types";

// Walks up from `start` looking for a directory containing `.dolt-data/hq`.
// Returns the first match (the Gas Town root), or undefined at the filesystem root.
export function findTownRoot(start: string | undefined): string | undefined {
	if (!start) return undefined;
	let dir = start;
	while (true) {
		if (existsSync(join(dir, ".dolt-data", "hq"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

function resolveTownCwd(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	const direct = explicitCwd ?? townRoot ?? process.env.GT_TOWN_ROOT;
	return findTownRoot(direct) ?? findTownRoot(process.cwd()) ?? direct;
}

function resolveTownRootForDolt(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	for (const c of [townRoot, process.env.GT_TOWN_ROOT, explicitCwd]) {
		const found = findTownRoot(c);
		if (found) return found;
	}
	return findTownRoot(process.cwd());
}

const doltConvoyRowsSchema = z.object({
	rows: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			status: z.string(),
			created_at: z.string(),
			tracked_id: z.string().nullable().optional(),
			tracked_title: z.string().nullable().optional(),
			tracked_status: z.string().nullable().optional(),
			tracked_issue_type: z.string().nullable().optional(),
			dependency_type: z.string().nullable().optional(),
		}),
	),
});

type DoltConvoyRow = z.infer<typeof doltConvoyRowsSchema>["rows"][number];

function escapeSqlString(value: string): string {
	return value.replaceAll("'", "''");
}

function buildDoltListConvoysQuery(args: ListConvoysArgs): string {
	const filters = ["i.issue_type = 'convoy'"];
	if (args.status) {
		filters.push(`i.status = '${escapeSqlString(args.status)}'`);
	} else if (!args.all) {
		filters.push("i.status <> 'closed'");
	}
	const limitClause = args.all || args.status ? "" : "limit 50";

	return `
with selected_convoys as (
  select i.id, i.title, i.status, i.created_at
  from issues i
  where ${filters.join(" and ")}
  order by i.created_at desc, i.id asc
  ${limitClause}
)
select
  i.id,
  i.title,
  i.status,
  i.created_at,
  d.depends_on_id as tracked_id,
  d.type as dependency_type,
  ti.title as tracked_title,
  ti.status as tracked_status,
  ti.issue_type as tracked_issue_type
from selected_convoys i
left join dependencies d
  on d.issue_id = i.id and d.type = 'tracks'
left join issues ti
  on ti.id = d.depends_on_id
order by i.created_at desc, i.id asc, d.created_at asc;
`.trim();
}

function normalizeDoltDate(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toISOString().replace(".000Z", "Z");
}

function rowsToConvoys(rows: DoltConvoyRow[]): Convoy[] {
	const byId = new Map<string, Convoy>();
	for (const row of rows) {
		let convoy = byId.get(row.id);
		if (!convoy) {
			convoy = {
				id: row.id,
				title: row.title,
				status: row.status,
				created_at: normalizeDoltDate(row.created_at),
				tracked: [],
				completed: 0,
				total: 0,
			};
			byId.set(row.id, convoy);
		}
		if (!row.tracked_id) continue;
		convoy.tracked.push({
			id: row.tracked_id,
			title: row.tracked_title ?? "",
			status: row.tracked_status ?? "",
			dependency_type: row.dependency_type ?? "tracks",
			issue_type: row.tracked_issue_type ?? "",
		});
	}

	for (const convoy of byId.values()) {
		convoy.total = convoy.tracked.length;
		convoy.completed = convoy.tracked.filter(
			(tracked) => tracked.status === "closed",
		).length;
	}

	return [...byId.values()];
}

async function listConvoysFromDolt(
	args: ListConvoysArgs,
	options: ExecGtOptions,
	deps: ExecGtDeps,
): Promise<Convoy[] | null> {
	const townRoot = resolveTownRootForDolt(args.townRoot, options.cwd);
	if (!townRoot) return null;

	const hqDoltDir = join(townRoot, ".dolt-data", "hq");
	const query = buildDoltListConvoysQuery(args);
	const { stdout, exitCode } = await execDolt(
		["sql", "-r", "json", "-q", query],
		{ ...options, cwd: hqDoltDir, readOnly: true },
		deps,
	);
	if (exitCode !== 0) return null;

	const parsed = doltConvoyRowsSchema.parse(JSON.parse(stdout));
	return convoyArraySchema.parse(rowsToConvoys(parsed.rows));
}

export interface ListConvoysArgs {
	/** Include closed convoys. Default: open-only. */
	all?: boolean;
	/** Filter to a single status. Passed through as --status=<value>. */
	status?: "open" | "closed";
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function listConvoys(
	args: ListConvoysArgs = {},
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<Convoy[]> {
	try {
		const doltResult = await listConvoysFromDolt(args, options, deps);
		if (doltResult) return doltResult;
	} catch {
		// Fall back to the canonical gt implementation if the Dolt layout or
		// schema differs from the local-first fast path we expect.
	}

	const argv: string[] = ["convoy", "list", "--json"];
	if (args.all) argv.push("--all");
	if (args.status) argv.push(`--status=${args.status}`);

	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd, readOnly: true },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return convoyArraySchema.parse(JSON.parse(stdout));
}

export interface ConvoyStatusArgs {
	id: string;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

// Map raw bd status to the convoy-board's narrowed BeadStatus. "stranded" is
// not derivable from status alone — the UI promotes "open" beads with no
// available polecat to "stranded" at render time.
export function deriveBeadStatus(raw: string): ConvoyBeadStatus {
	if (raw === "closed" || raw === "blocked" || raw === "hooked") return raw;
	return "open";
}

const doltConvoyBeadsSchema = z.object({
	rows: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			status: z.string(),
			assignee: z.string().nullable().optional(),
			priority: z.number().int().nullable().optional(),
		}),
	),
});

export interface GetConvoyBeadsArgs {
	convoyId: string;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function getConvoyBeads(
	args: GetConvoyBeadsArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<ConvoyBead[]> {
	const townRoot = resolveTownRootForDolt(args.townRoot, options.cwd);
	if (!townRoot) {
		throw new GastownCliError({
			argv: ["dolt"],
			exitCode: -1,
			stdout: "",
			stderr: "town root required for convoy beads fast path",
		});
	}
	const query = `select i.id, i.title, i.status, i.assignee, i.priority from issues i join dependencies d on d.depends_on_id = i.id where d.issue_id = '${escapeSqlString(args.convoyId)}' and d.type = 'tracks' order by i.created_at desc;`;
	const { stdout, stderr, exitCode } = await execDolt(
		["sql", "-r", "json", "-q", query],
		{ ...options, cwd: join(townRoot, ".dolt-data", "hq"), readOnly: true },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({
			argv: ["dolt"],
			exitCode,
			stdout,
			stderr,
		});
	}
	const { rows } = doltConvoyBeadsSchema.parse(JSON.parse(stdout));
	return rows.map((r) => ({
		id: r.id,
		title: r.title,
		status: deriveBeadStatus(r.status),
		assignee: r.assignee ?? null,
		priority: r.priority ?? 0,
	}));
}

const doltBeadDetailSchema = z.object({
	rows: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			description: z.string().nullable().optional(),
			status: z.string(),
			priority: z.number().int().nullable().optional(),
			issue_type: z.string().nullable().optional(),
			assignee: z.string().nullable().optional(),
			created_at: z.string().nullable().optional(),
			updated_at: z.string().nullable().optional(),
		}),
	),
});

const doltBeadConvoysSchema = z.object({
	rows: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			status: z.string(),
		}),
	),
});

export interface GetBeadDetailArgs {
	beadId: string;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function getBeadDetail(
	args: GetBeadDetailArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<BeadDetail> {
	const townRoot = resolveTownRootForDolt(args.townRoot, options.cwd);
	if (!townRoot) {
		throw new GastownCliError({
			argv: ["dolt"],
			exitCode: -1,
			stdout: "",
			stderr: "town root required for bead detail fast path",
		});
	}
	const cwd = join(townRoot, ".dolt-data", "hq");
	const id = escapeSqlString(args.beadId);
	const beadQuery = `select id, title, description, status, priority, issue_type, assignee, created_at, updated_at from issues where id = '${id}' limit 1;`;
	const convoysQuery = `select c.id, c.title, c.status from issues c join dependencies d on d.issue_id = c.id and d.type = 'tracks' where d.depends_on_id = '${id}' and c.issue_type = 'convoy' order by c.created_at desc;`;
	const [beadRes, convoyRes] = await Promise.all([
		execDolt(
			["sql", "-r", "json", "-q", beadQuery],
			{ ...options, cwd, readOnly: true },
			deps,
		),
		execDolt(
			["sql", "-r", "json", "-q", convoysQuery],
			{ ...options, cwd, readOnly: true },
			deps,
		),
	]);
	if (beadRes.exitCode !== 0) {
		throw new GastownCliError({
			argv: ["dolt"],
			exitCode: beadRes.exitCode,
			stdout: beadRes.stdout,
			stderr: beadRes.stderr,
		});
	}
	const { rows: beadRows } = doltBeadDetailSchema.parse(
		JSON.parse(beadRes.stdout),
	);
	const row = beadRows[0];
	if (!row) {
		throw new GastownCliError({
			argv: ["dolt"],
			exitCode: -1,
			stdout: "",
			stderr: `bead ${args.beadId} not found`,
		});
	}
	const convoys =
		convoyRes.exitCode === 0
			? doltBeadConvoysSchema.parse(JSON.parse(convoyRes.stdout)).rows
			: [];
	return beadDetailSchema.parse({
		id: row.id,
		title: row.title,
		description: row.description ?? null,
		status: row.status,
		priority: row.priority ?? 0,
		issueType: row.issue_type ?? null,
		assignee: row.assignee ?? null,
		createdAt: row.created_at ? normalizeDoltDate(row.created_at) : null,
		updatedAt: row.updated_at ? normalizeDoltDate(row.updated_at) : null,
		convoys,
	});
}

export interface CreateConvoyArgs {
	name: string;
	issueIds: readonly string[];
	owned?: boolean;
	mergeStrategy?: "direct" | "mr" | "local";
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export interface CreateConvoyResult {
	id: string;
	title: string;
}

const CONVOY_CREATED_RE = /Created convoy[^\n]*?\s(hq-cv-[A-Za-z0-9]+)/u;

export async function createConvoy(
	args: CreateConvoyArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<CreateConvoyResult> {
	if (args.issueIds.length === 0) {
		throw new GastownCliError({
			argv: ["convoy", "create"],
			exitCode: -1,
			stdout: "",
			stderr: "createConvoy requires at least one issue ID",
		});
	}
	const argv: string[] = ["convoy", "create", args.name, ...args.issueIds];
	if (args.owned) argv.push("--owned");
	if (args.mergeStrategy) argv.push(`--merge=${args.mergeStrategy}`);

	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	const match = stdout.match(CONVOY_CREATED_RE);
	if (!match?.[1]) {
		throw new GastownCliError({
			argv,
			exitCode,
			stdout,
			stderr: "could not parse convoy id from gt convoy create output",
		});
	}
	return { id: match[1], title: args.name };
}

export async function convoyStatus(
	args: ConvoyStatusArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<ConvoyStatus> {
	const argv: string[] = ["convoy", "status", args.id, "--json"];

	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execGt(
		argv,
		{ ...options, cwd, readOnly: true },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
	return convoyStatusSchema.parse(JSON.parse(stdout));
}
