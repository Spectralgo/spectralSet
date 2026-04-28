import { spawn } from "node:child_process";
import {
	checkRecovery,
	type GastownCliClientOptions,
	listBeads,
	listInbox,
	listPolecats,
	listRigs,
	listWorktrees,
	mergeStrategySchema,
	nudge,
	nuke,
	peek,
	probe,
	sling,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { createGastownAgentsRouter } from "./agents";
import type {
	applyReconciliation as ApplyReconciliationFn,
	ReconcileResult,
} from "./apply-reconciliation";
import { createGastownBeadsRouter } from "./beads";
import { createGastownConvoysRouter } from "./convoys";
import type {
	ensureProject as EnsureProjectFn,
	EnsureProjectResult,
} from "./ensure-project";
import { createGastownMailRouter } from "./mail";
import { createMailInboxCache } from "./mail-cache";
import { extractPolecatWorkspaceSpecs } from "./polecat-discovery";
import { resolveTownPath } from "./resolve-town-path";
import { createGastownTodayRouter } from "./today";

export { resolveTownPath } from "./resolve-town-path";

export interface TmuxGastownLookup {
	townRoot: string | undefined;
	socket: string | undefined;
}

// Reads GT_TOWN_ROOT from any running Gas Town tmux socket, and returns
// the matched socket name alongside it. The Gas Town shell sets
// GT_TOWN_ROOT as a global tmux env var (`tmux set-environment -g
// GT_TOWN_ROOT <town>`); agents spawned under tmux inherit it. Electron
// doesn't, so we query tmux directly.
//
// The socket name is needed by the renderer to issue
// `tmux -L <socket> attach-session -t <prefix>-<polecat>` when attaching
// to a live polecat session from the Gas Town sidebar.
async function readTownAndSocketFromTmux(
	env: NodeJS.ProcessEnv,
): Promise<TmuxGastownLookup> {
	const t0 = Date.now();
	const SOCKET_GLOB = "spectralgastown-";
	const sockets = await listTmuxSockets(env);
	console.log("[gastown-tmux-lookup] start", {
		socketCount: sockets.length,
		socketHead: sockets.slice(0, 3),
	});
	for (const socket of sockets) {
		if (!socket.includes(SOCKET_GLOB)) continue;
		const value = await runTmux(
			["-L", socket, "show-environment", "-g", "GT_TOWN_ROOT"],
			env,
		);
		if (!value) continue;
		const match = value.match(/^GT_TOWN_ROOT=(.+)$/m);
		if (match?.[1]) {
			const lookup = { townRoot: match[1].trim(), socket };
			console.log("[gastown-tmux-lookup] done", {
				townRoot: lookup.townRoot,
				socket: lookup.socket,
				elapsedMs: Date.now() - t0,
			});
			return lookup;
		}
	}
	console.log("[gastown-tmux-lookup] done", {
		townRoot: undefined,
		socket: undefined,
		elapsedMs: Date.now() - t0,
	});
	return { townRoot: undefined, socket: undefined };
}

async function listTmuxSockets(env: NodeJS.ProcessEnv): Promise<string[]> {
	try {
		const { readdir } = await import("node:fs/promises");
		const tmpDir =
			env.TMUX_TMPDIR ?? `/private/tmp/tmux-${process.getuid?.() ?? ""}`;
		const entries = await readdir(tmpDir);
		return entries;
	} catch {
		return [];
	}
}

function runTmux(
	argv: string[],
	env: NodeJS.ProcessEnv,
): Promise<string | undefined> {
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

const nudgeInputSchema = z.object({
	rig: z.string().min(1),
	polecat: z.string().min(1),
	message: z.string().min(1).max(10_000),
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

const ensureProjectInputSchema = z.object({
	townRoot: z.string().min(1),
	townName: z.string().nullable(),
	tmuxSocket: z.string().nullable(),
});

// Electron's process.env on macOS doesn't include PATH entries from the
// user's shell rc files (homebrew, asdf, mise, etc.), so a `gt` installed
// via brew is invisible to plain `spawn("gt", ...)`. Resolve the full
// shell PATH (cached) and pass it as the exec env on every call.
async function shellOptions(): Promise<GastownCliClientOptions> {
	return {
		env: await getProcessEnvWithShellPath(),
		cwd: process.env.HOME,
	};
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
	listInboxFn?: typeof listInbox;
	// Inject the DB-writing reconciliation step; default lazy-imports
	// from ./apply-reconciliation. Tests pass a spy so the router can be
	// exercised without dragging in the electron main-process localDb
	// module at evaluation time.
	applyReconciliationFn?: (
		opts: Parameters<typeof ApplyReconciliationFn>[0],
	) => ReconcileResult | Promise<ReconcileResult>;
	// Inject the DB-writing project/preset upsert. Default lazy-imports
	// from ./ensure-project so tests can exercise the router wiring
	// without dragging in the electron main-process localDb module.
	ensureProjectFn?: (
		opts: Parameters<typeof EnsureProjectFn>[0],
	) => EnsureProjectResult | Promise<EnsureProjectResult>;
	// Override the tmux env lookup (used by tests to isolate from the
	// host's real tmux state). Returns the GT_TOWN_ROOT value + socket
	// name, or `{ townRoot: undefined, socket: undefined }` when no
	// Gas Town tmux socket is present.
	readTmuxTownRootFn?: (env: NodeJS.ProcessEnv) => Promise<TmuxGastownLookup>;
	nudgeFn?: typeof nudge;
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
	const listInboxImpl = deps.listInboxFn ?? listInbox;
	const applyReconciliationOverride = deps.applyReconciliationFn;
	const ensureProjectOverride = deps.ensureProjectFn;
	const readTmuxTownRootImpl =
		deps.readTmuxTownRootFn ?? readTownAndSocketFromTmux;
	const nudgeImpl = deps.nudgeFn ?? nudge;

	async function applyReconciliationImpl(opts: {
		projectId: string;
		specs: readonly import("./polecat-discovery").PolecatWorkspaceSpec[];
	}): Promise<ReconcileResult> {
		if (applyReconciliationOverride) return applyReconciliationOverride(opts);
		const { applyReconciliation } = await import("./apply-reconciliation");
		return applyReconciliation(opts);
	}

	async function ensureProjectImpl(opts: {
		townRoot: string;
		townName: string | null;
		tmuxSocket: string | null;
	}): Promise<EnsureProjectResult> {
		if (ensureProjectOverride) return ensureProjectOverride(opts);
		const { ensureProject } = await import("./ensure-project");
		return ensureProject(opts);
	}

	// Cache of the town root reported by the most recent probe.
	// Consulted as a fallback when the user leaves the Town Path input blank.
	// Populated after every probe call (including failures — reset to
	// undefined so stale roots don't linger across uninstalls).
	let cachedTownRoot: string | undefined;

	// Town root + socket discovered from the Gas Town tmux env. Read
	// lazily on the first probe. The town root provides a known-good
	// cwd for `gt status --json` even before the user sets an override.
	// The socket is surfaced to the renderer so it can build
	// `tmux -L <socket> attach-session` commands when attaching to a
	// polecat from the sidebar.
	let tmuxTownRoot: string | undefined;
	let tmuxSocket: string | undefined;
	let tmuxLookupDone = false;

	function resolveEffectiveTownPath(
		townPath: string | undefined,
	): string | undefined {
		const expanded = resolveTownPath(townPath);
		if (expanded) return expanded;
		if (cachedTownRoot) return cachedTownRoot;
		return tmuxTownRoot;
	}

	const inboxCache = createMailInboxCache({
		listInboxFn: listInboxImpl,
		resolveTownPathFn: resolveEffectiveTownPath,
		shellOptionsFn: shellOptions,
	});

	return router({
		probe: publicProcedure.input(probeInputSchema).query(async ({ input }) => {
			const opts = await shellOptions();
			if (!tmuxLookupDone) {
				const lookup = await readTmuxTownRootImpl(opts.env ?? process.env);
				tmuxTownRoot = lookup.townRoot;
				tmuxSocket = lookup.socket;
				tmuxLookupDone = true;
			}
			const townRoot = resolveEffectiveTownPath(input?.townPath);
			if (townRoot) {
				opts.cwd = townRoot;
				opts.env = { ...(opts.env ?? {}), GT_TOWN_ROOT: townRoot };
			}
			const result = await probeImpl(opts);
			cachedTownRoot = result.townRoot ?? undefined;
			return { ...result, tmuxSocket: tmuxSocket ?? null };
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
		nudge: publicProcedure
			.input(nudgeInputSchema)
			.mutation(async ({ input }) => {
				await nudgeImpl(
					{
						rig: input.rig,
						polecat: input.polecat,
						message: input.message,
						townRoot: resolveEffectiveTownPath(input.townPath),
					},
					await shellOptions(),
				);
				return { ok: true as const };
			}),
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
		ensureProject: publicProcedure
			.input(ensureProjectInputSchema)
			.mutation(async ({ input }): Promise<EnsureProjectResult> => {
				return ensureProjectImpl({
					townRoot: input.townRoot,
					townName: input.townName,
					tmuxSocket: input.tmuxSocket,
				});
			}),
		agents: createGastownAgentsRouter({
			resolveTownPathFn: resolveEffectiveTownPath,
		}),
		beads: createGastownBeadsRouter({
			resolveTownPathFn: resolveEffectiveTownPath,
		}),
		convoys: createGastownConvoysRouter({
			resolveTownPathFn: resolveEffectiveTownPath,
		}),
		mail: createGastownMailRouter({
			resolveTownPathFn: resolveEffectiveTownPath,
			inboxCache,
		}),
		today: createGastownTodayRouter({
			resolveTownPathFn: resolveEffectiveTownPath,
			inboxCache,
		}),
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
