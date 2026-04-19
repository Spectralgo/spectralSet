import { spawn } from "node:child_process";
import {
	checkRecovery,
	expandTilde,
	type GastownCliClientOptions,
	listBeads,
	listPolecats,
	listRigs,
	listWorktrees,
	mergeStrategySchema,
	nuke,
	peek,
	probe,
	sling,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import type {
	applyReconciliation as ApplyReconciliationFn,
	ReconcileResult,
} from "./apply-reconciliation";
import { extractPolecatWorkspaceSpecs } from "./polecat-discovery";

// Reads GT_TOWN_ROOT from any running Gas Town tmux socket. The Gas Town
// shell sets this as a global tmux env var (`tmux set-environment -g
// GT_TOWN_ROOT <town>`); agents spawned under tmux inherit it. Electron
// doesn't, so we query tmux directly. Returns undefined if no matching
// socket exists or the var is unset.
async function readTownRootFromTmux(env: NodeJS.ProcessEnv): Promise<string | undefined> {
	const SOCKET_GLOB = "spectralgastown-";
	const sockets = await listTmuxSockets(env);
	for (const socket of sockets) {
		if (!socket.includes(SOCKET_GLOB)) continue;
		const value = await runTmux(
			["-L", socket, "show-environment", "-g", "GT_TOWN_ROOT"],
			env,
		);
		if (!value) continue;
		const match = value.match(/^GT_TOWN_ROOT=(.+)$/m);
		if (match && match[1]) return match[1].trim();
	}
	return undefined;
}

async function listTmuxSockets(env: NodeJS.ProcessEnv): Promise<string[]> {
	try {
		const { readdir } = await import("node:fs/promises");
		const tmpDir = env.TMUX_TMPDIR ?? `/private/tmp/tmux-${process.getuid?.() ?? ""}`;
		const entries = await readdir(tmpDir);
		return entries;
	} catch {
		return [];
	}
}

function runTmux(argv: string[], env: NodeJS.ProcessEnv): Promise<string | undefined> {
	return new Promise((resolve) => {
		const child = spawn("tmux", argv, {
			env,
			stdio: ["ignore", "pipe", "ignore"],
		});
		let stdout = "";
		child.stdout?.on("data", (chunk) => {
			stdout += chunk.toString("utf8");
		});
		child.on("error", () => resolve(undefined));
		child.on("close", (code) => {
			resolve(code === 0 ? stdout : undefined);
		});
		setTimeout(() => {
			child.kill("SIGKILL");
			resolve(undefined);
		}, 2_000);
	});
}

const townPathSchema = z.string().min(1).optional();

const probeInputSchema = z
	.object({
		townPath: townPathSchema,
	})
	.optional();

const listRigsInputSchema = z
	.object({
		townPath: townPathSchema,
	})
	.optional();

const listPolecatsInputSchema = z
	.object({
		rig: z.string().min(1).optional(),
		townPath: townPathSchema,
	})
	.optional();

const peekInputSchema = z.object({
	rig: z.string().min(1),
	polecat: z.string().min(1),
	lines: z.number().int().positive().max(2000).optional(),
	townPath: townPathSchema,
});

const beadStatusSchema = z.enum(["open", "closed", "in_progress"]);

const listBeadsInputSchema = z.object({
	rig: z.string().min(1),
	status: beadStatusSchema.optional(),
	limit: z.number().int().positive().max(500).optional(),
	townPath: townPathSchema,
});

const slingInputSchema = z.object({
	rig: z.string().min(1),
	bead: z.string().min(1),
	mergeStrategy: mergeStrategySchema,
	notes: z.string().max(10_000).optional(),
	townPath: townPathSchema,
});

const polecatTargetSchema = z.object({
	rig: z.string().min(1),
	polecat: z.string().min(1),
	townPath: townPathSchema,
});

const nukeInputSchema = polecatTargetSchema.extend({
	force: z.boolean().optional(),
});

const listWorktreesInputSchema = z.object({
	rig: z.string().min(1),
	townPath: townPathSchema,
});

const reconcileInputSchema = z.object({
	rig: z.string().min(1),
	projectId: z.string().min(1),
	townPath: townPathSchema,
});

// Resolves the user-supplied Town Path override into an absolute cwd.
// Precedence (per ss-iq9 + ss-e12):
//   1. expandTilde(userTownPath) when non-empty.
//   2. cachedProbe.townRoot from `gt status --json` (populated by the
//      probe handler; see createGastownRouter).
//   3. process.env.GT_TOWN_ROOT (handled downstream by gt).
//   4. undefined — let gt pick its default.
// `~` expansion must happen in the main process: Node's spawn({ cwd }) does
// not expand tildes (shells do), so a literal "~/..." is treated as a
// relative path and lookup fails.
export function resolveTownPath(
	townPath: string | undefined,
): string | undefined {
	const expanded = expandTilde(townPath);
	if (!expanded) return undefined;
	return expanded.replace(/\/+$/, "");
}

// Electron's process.env on macOS doesn't include PATH entries from the
// user's shell rc files (homebrew, asdf, mise, etc.), so a `gt` installed
// via brew is invisible to plain `spawn("gt", ...)`. Resolve the full
// shell PATH (cached) and pass it as the exec env on every call.
async function shellOptions(): Promise<GastownCliClientOptions> {
	return { env: await getProcessEnvWithShellPath() };
}

interface GastownRouterDeps {
	probeFn?: typeof probe;
	listRigsFn?: typeof listRigs;
	listPolecatsFn?: typeof listPolecats;
	peekFn?: typeof peek;
	listBeadsFn?: typeof listBeads;
	slingFn?: typeof sling;
	checkRecoveryFn?: typeof checkRecovery;
	nukeFn?: typeof nuke;
	listWorktreesFn?: typeof listWorktrees;
	// Inject the DB-writing reconciliation step; default lazy-imports
	// from ./apply-reconciliation. Tests pass a spy so the router can be
	// exercised without dragging in the electron main-process localDb
	// module at evaluation time.
	applyReconciliationFn?: typeof ApplyReconciliationFn;
	// Override the tmux env lookup (used by tests to isolate from the
	// host's real tmux state). Returns the GT_TOWN_ROOT value, or
	// undefined when no Gas Town tmux socket is present.
	readTmuxTownRootFn?: (env: NodeJS.ProcessEnv) => Promise<string | undefined>;
}

export const createGastownRouter = (deps: GastownRouterDeps = {}) => {
	const probeImpl = deps.probeFn ?? probe;
	const listRigsImpl = deps.listRigsFn ?? listRigs;
	const listPolecatsImpl = deps.listPolecatsFn ?? listPolecats;
	const peekImpl = deps.peekFn ?? peek;
	const listBeadsImpl = deps.listBeadsFn ?? listBeads;
	const slingImpl = deps.slingFn ?? sling;
	const checkRecoveryImpl = deps.checkRecoveryFn ?? checkRecovery;
	const nukeImpl = deps.nukeFn ?? nuke;
	const listWorktreesImpl = deps.listWorktreesFn ?? listWorktrees;
	const applyReconciliationOverride = deps.applyReconciliationFn;
	const readTmuxTownRootImpl = deps.readTmuxTownRootFn ?? readTownRootFromTmux;

	async function applyReconciliationImpl(opts: {
		projectId: string;
		specs: readonly import("./polecat-discovery").PolecatWorkspaceSpec[];
	}): Promise<ReconcileResult> {
		if (applyReconciliationOverride) return applyReconciliationOverride(opts);
		const { applyReconciliation } = await import("./apply-reconciliation");
		return applyReconciliation(opts);
	}

	// Cache of the town root reported by the most recent probe.
	// Consulted as a fallback when the user leaves the Town Path input blank.
	// Populated after every probe call (including failures — reset to
	// undefined so stale roots don't linger across uninstalls).
	let cachedTownRoot: string | undefined;

	// Town root discovered from the Gas Town tmux socket env. Read lazily
	// on the first probe. Provides a known-good cwd for gt status --json
	// even before the user sets an override or a successful probe caches
	// its result.
	let tmuxTownRoot: string | undefined;
	let tmuxLookupDone = false;

	function resolveEffectiveTownPath(
		townPath: string | undefined,
	): string | undefined {
		const expanded = resolveTownPath(townPath);
		if (expanded) return expanded;
		if (cachedTownRoot) return cachedTownRoot;
		return tmuxTownRoot;
	}

	return router({
		probe: publicProcedure.input(probeInputSchema).query(async ({ input }) => {
			const opts = await shellOptions();
			if (!tmuxLookupDone) {
				tmuxTownRoot = await readTmuxTownRootImpl(opts.env ?? process.env);
				tmuxLookupDone = true;
			}
			const townRoot = resolveEffectiveTownPath(input?.townPath);
			if (townRoot) {
				opts.cwd = townRoot;
				opts.env = { ...(opts.env ?? {}), GT_TOWN_ROOT: townRoot };
			}
			const result = await probeImpl(opts);
			cachedTownRoot = result.townRoot ?? undefined;
			return result;
		}),
		listRigs: publicProcedure
			.input(listRigsInputSchema)
			.query(async ({ input }) =>
				listRigsImpl(
					{ townRoot: resolveEffectiveTownPath(input?.townPath) },
					await shellOptions(),
				),
			),
		listPolecats: publicProcedure
			.input(listPolecatsInputSchema)
			.query(async ({ input }) =>
				listPolecatsImpl(
					{
						rig: input?.rig,
						townRoot: resolveEffectiveTownPath(input?.townPath),
					},
					await shellOptions(),
				),
			),
		peek: publicProcedure.input(peekInputSchema).query(async ({ input }) =>
			peekImpl(
				{
					rig: input.rig,
					polecat: input.polecat,
					lines: input.lines,
					townRoot: resolveEffectiveTownPath(input.townPath),
				},
				await shellOptions(),
			),
		),
		listBeads: publicProcedure
			.input(listBeadsInputSchema)
			.query(async ({ input }) =>
				listBeadsImpl(
					{
						rig: input.rig,
						status: input.status,
						limit: input.limit,
						gastownRoot: resolveEffectiveTownPath(input.townPath),
					},
					await shellOptions(),
				),
			),
		sling: publicProcedure.input(slingInputSchema).mutation(async ({ input }) =>
			slingImpl(
				{
					rig: input.rig,
					bead: input.bead,
					mergeStrategy: input.mergeStrategy,
					notes: input.notes,
					townRoot: resolveEffectiveTownPath(input.townPath),
				},
				await shellOptions(),
			),
		),
		checkRecovery: publicProcedure
			.input(polecatTargetSchema)
			.query(async ({ input }) =>
				checkRecoveryImpl(
					{
						rig: input.rig,
						polecat: input.polecat,
						townRoot: resolveEffectiveTownPath(input.townPath),
					},
					await shellOptions(),
				),
			),
		nuke: publicProcedure.input(nukeInputSchema).mutation(async ({ input }) =>
			nukeImpl(
				{
					rig: input.rig,
					polecat: input.polecat,
					force: input.force,
					townRoot: resolveEffectiveTownPath(input.townPath),
				},
				await shellOptions(),
			),
		),
		listWorktrees: publicProcedure
			.input(listWorktreesInputSchema)
			.query(async ({ input }) =>
				listWorktreesImpl(
					{
						rig: input.rig,
						townRoot: resolveEffectiveTownPath(input.townPath),
					},
					await shellOptions(),
				),
			),
		reconcile: publicProcedure
			.input(reconcileInputSchema)
			.mutation(async ({ input }): Promise<ReconcileResult> => {
				const townRoot = resolveEffectiveTownPath(input.townPath);
				const opts = await shellOptions();
				const [worktreeList, polecatList] = await Promise.all([
					listWorktreesImpl({ rig: input.rig, townRoot }, opts),
					listPolecatsImpl({ rig: input.rig, townRoot }, opts),
				]);
				const specs = extractPolecatWorkspaceSpecs({
					town: townRoot ?? "",
					rig: input.rig,
					worktrees: worktreeList,
					polecats: polecatList,
				});
				return applyReconciliationImpl({
					projectId: input.projectId,
					specs,
				});
			}),
	});
};

export type { ReconcileResult } from "./apply-reconciliation";
