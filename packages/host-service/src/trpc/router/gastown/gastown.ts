import {
	checkRecovery,
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
import { publicProcedure, router } from "../../index";

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

export const gastownRouter = router({
	probe: publicProcedure.query(() => probe()),
	listRigs: publicProcedure.query(() => listRigs()),
	listPolecats: publicProcedure
		.input(listPolecatsInputSchema)
		.query(({ input }) => listPolecats({ rig: input?.rig })),
	peek: publicProcedure
		.input(peekInputSchema)
		.query(({ input }) =>
			peek({ rig: input.rig, polecat: input.polecat, lines: input.lines }),
		),
	listBeads: publicProcedure.input(listBeadsInputSchema).query(({ input }) =>
		listBeads({
			rig: input.rig,
			status: input.status,
			limit: input.limit,
		}),
	),
	sling: publicProcedure.input(slingInputSchema).mutation(({ input }) =>
		sling({
			rig: input.rig,
			bead: input.bead,
			mergeStrategy: input.mergeStrategy,
			notes: input.notes,
		}),
	),
	checkRecovery: publicProcedure
		.input(polecatTargetSchema)
		.query(({ input }) =>
			checkRecovery({ rig: input.rig, polecat: input.polecat }),
		),
	nuke: publicProcedure.input(nukeInputSchema).mutation(({ input }) =>
		nuke({
			rig: input.rig,
			polecat: input.polecat,
			force: input.force,
		}),
	),
});
