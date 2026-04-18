import { z } from "zod";

export const rigSchema = z.object({
	name: z.string(),
	witnessRunning: z.boolean(),
	refineryRunning: z.boolean(),
	polecatCount: z.number().int().nonnegative(),
	crewCount: z.number().int().nonnegative(),
});

export type Rig = z.infer<typeof rigSchema>;

export const probeResultSchema = z.object({
	installed: z.boolean(),
	version: z.string().nullable(),
});

export type ProbeResult = z.infer<typeof probeResultSchema>;
