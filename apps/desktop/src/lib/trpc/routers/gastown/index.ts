import {
	checkRecovery,
	expandTilde,
	type GastownCliClientOptions,
	listBeads,
	listPolecats,
	listRigs,
	mergeStrategySchema,
	nuke,
	peek,
	probe,
	sling,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";

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

	// Cache of the town root reported by the most recent probe.
	// Consulted as a fallback when the user leaves the Town Path input blank.
	// Populated after every probe call (including failures — reset to
	// undefined so stale roots don't linger across uninstalls).
	let cachedTownRoot: string | undefined;

	function resolveEffectiveTownPath(
		townPath: string | undefined,
	): string | undefined {
		const expanded = resolveTownPath(townPath);
		if (expanded) return expanded;
		return cachedTownRoot;
	}

	return router({
		probe: publicProcedure.input(probeInputSchema).query(async ({ input }) => {
			const townRoot = resolveEffectiveTownPath(input?.townPath);
			const opts = await shellOptions();
			if (townRoot) opts.cwd = townRoot;
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
	});
};
