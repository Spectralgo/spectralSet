import {
	checkRecovery,
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

const listPolecatsInputSchema = z
	.object({
		rig: z.string().min(1).optional(),
	})
	.optional();

const peekInputSchema = z.object({
	rig: z.string().min(1),
	polecat: z.string().min(1),
	lines: z.number().int().positive().max(2000).optional(),
});

const beadStatusSchema = z.enum(["open", "closed", "in_progress"]);

const listBeadsInputSchema = z.object({
	rig: z.string().min(1),
	status: beadStatusSchema.optional(),
	limit: z.number().int().positive().max(500).optional(),
});

const slingInputSchema = z.object({
	rig: z.string().min(1),
	bead: z.string().min(1),
	mergeStrategy: mergeStrategySchema,
	notes: z.string().max(10_000).optional(),
});

const polecatTargetSchema = z.object({
	rig: z.string().min(1),
	polecat: z.string().min(1),
});

const nukeInputSchema = polecatTargetSchema.extend({
	force: z.boolean().optional(),
});

// Electron's process.env on macOS doesn't include PATH entries from the
// user's shell rc files (homebrew, asdf, mise, etc.), so a `gt` installed
// via brew is invisible to plain `spawn("gt", ...)`. Resolve the full
// shell PATH (cached) and pass it as the exec env on every call.
async function shellOptions(): Promise<GastownCliClientOptions> {
	return { env: await getProcessEnvWithShellPath() };
}

export const createGastownRouter = () => {
	return router({
		probe: publicProcedure.query(async () => probe(await shellOptions())),
		listRigs: publicProcedure.query(async () => listRigs(await shellOptions())),
		listPolecats: publicProcedure
			.input(listPolecatsInputSchema)
			.query(async ({ input }) =>
				listPolecats({ rig: input?.rig }, await shellOptions()),
			),
		peek: publicProcedure
			.input(peekInputSchema)
			.query(async ({ input }) =>
				peek(
					{ rig: input.rig, polecat: input.polecat, lines: input.lines },
					await shellOptions(),
				),
			),
		listBeads: publicProcedure
			.input(listBeadsInputSchema)
			.query(async ({ input }) =>
				listBeads(
					{
						rig: input.rig,
						status: input.status,
						limit: input.limit,
					},
					await shellOptions(),
				),
			),
		sling: publicProcedure.input(slingInputSchema).mutation(async ({ input }) =>
			sling(
				{
					rig: input.rig,
					bead: input.bead,
					mergeStrategy: input.mergeStrategy,
					notes: input.notes,
				},
				await shellOptions(),
			),
		),
		checkRecovery: publicProcedure
			.input(polecatTargetSchema)
			.query(async ({ input }) =>
				checkRecovery(
					{ rig: input.rig, polecat: input.polecat },
					await shellOptions(),
				),
			),
		nuke: publicProcedure.input(nukeInputSchema).mutation(async ({ input }) =>
			nuke(
				{
					rig: input.rig,
					polecat: input.polecat,
					force: input.force,
				},
				await shellOptions(),
			),
		),
	});
};
