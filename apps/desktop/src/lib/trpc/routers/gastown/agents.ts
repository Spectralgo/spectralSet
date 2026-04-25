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
			.query(async ({ input }) => {
				const resolved = resolveTownPathImpl(input?.townPath);
				const opts = await shellOptions();
				try {
					return await listAgentsImpl({ townRoot: resolved }, opts);
				} catch (e) {
					const err = e as Error;
					console.error("[gastown-agents.list] FAIL", {
						message: err.message,
						name: err.name,
						stack: err.stack?.split("\n").slice(0, 6).join(" | "),
						cause: (err as unknown as { cause?: unknown }).cause,
					});
					throw e;
				}
			}),
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
