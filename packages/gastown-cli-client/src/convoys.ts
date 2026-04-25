import {
	type ExecGtDeps,
	type ExecGtOptions,
	execGt,
	GastownCliError,
} from "./exec";
import {
	type Convoy,
	type ConvoyStatus,
	convoyArraySchema,
	convoyStatusSchema,
} from "./types";

function resolveTownCwd(
	townRoot: string | undefined,
	explicitCwd: string | undefined,
): string | undefined {
	if (explicitCwd) return explicitCwd;
	return townRoot ?? process.env.GT_TOWN_ROOT ?? undefined;
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
