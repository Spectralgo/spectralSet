import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
	type ExecGtDeps,
	type ExecGtOptions,
	execBd,
	execDolt,
	execGt,
	GastownCliError,
} from "./exec";
import {
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

export type MutableConvoyBeadStatus = "open" | "hooked" | "closed";

export interface UpdateConvoyBeadStatusArgs {
	beadId: string;
	status: MutableConvoyBeadStatus;
	/** Gas Town town root. Defaults to process.env.GT_TOWN_ROOT. */
	townRoot?: string;
}

export async function updateConvoyBeadStatus(
	args: UpdateConvoyBeadStatusArgs,
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<void> {
	const argv = ["update", args.beadId, "--status", args.status];
	const cwd = resolveTownCwd(args.townRoot, options.cwd);
	const { stdout, stderr, exitCode } = await execBd(
		argv,
		{ ...options, cwd },
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({ argv, exitCode, stdout, stderr });
	}
}
