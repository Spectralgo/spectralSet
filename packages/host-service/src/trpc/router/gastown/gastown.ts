import {
	listPolecats,
	listRigs,
	peek,
	probe,
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
});
