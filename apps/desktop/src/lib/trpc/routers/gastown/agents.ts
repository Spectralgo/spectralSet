import {
	agentKindSchema,
	getAgent,
	listAgents,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { resolveTownPath } from "./resolve-town-path";

const townPathSchema = z.string().min(1).optional();

const listAgentsInputSchema = z
	.object({
		townPath: townPathSchema,
	})
	.optional();

const getAgentInputSchema = z.object({
	kind: agentKindSchema,
	rig: z.string().min(1).optional(),
	name: z.string().min(1),
	townPath: townPathSchema,
});

interface GastownAgentsRouterDeps {
	listAgentsFn?: typeof listAgents;
	getAgentFn?: typeof getAgent;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
}

async function shellOptions() {
	return { env: await getProcessEnvWithShellPath() };
}

export const createGastownAgentsRouter = (
	deps: GastownAgentsRouterDeps = {},
) => {
	const listAgentsImpl = deps.listAgentsFn ?? listAgents;
	const getAgentImpl = deps.getAgentFn ?? getAgent;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;

	return router({
		list: publicProcedure
			.input(listAgentsInputSchema)
			.query(async ({ input }) =>
				listAgentsImpl(
					{ townRoot: resolveTownPathImpl(input?.townPath) },
					await shellOptions(),
				),
			),
		get: publicProcedure.input(getAgentInputSchema).query(async ({ input }) =>
			getAgentImpl(
				{
					kind: input.kind,
					rig: input.rig,
					name: input.name,
					townRoot: resolveTownPathImpl(input.townPath),
				},
				await shellOptions(),
			),
		),
	});
};
