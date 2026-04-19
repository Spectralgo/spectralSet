import { convoyStatus, listConvoys } from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { resolveTownPath } from "./resolve-town-path";

const townPathSchema = z.string().min(1).optional();

const listConvoysInputSchema = z
	.object({
		all: z.boolean().optional(),
		status: z.enum(["open", "closed"]).optional(),
		townPath: townPathSchema,
	})
	.optional();

const convoyStatusInputSchema = z.object({
	id: z.string().min(1),
	townPath: townPathSchema,
});

interface GastownConvoysRouterDeps {
	listConvoysFn?: typeof listConvoys;
	convoyStatusFn?: typeof convoyStatus;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
}

async function shellOptions() {
	return { env: await getProcessEnvWithShellPath() };
}

export const createGastownConvoysRouter = (
	deps: GastownConvoysRouterDeps = {},
) => {
	const listConvoysImpl = deps.listConvoysFn ?? listConvoys;
	const convoyStatusImpl = deps.convoyStatusFn ?? convoyStatus;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;

	return router({
		list: publicProcedure
			.input(listConvoysInputSchema)
			.query(async ({ input }) =>
				listConvoysImpl(
					{
						all: input?.all,
						status: input?.status,
						townRoot: resolveTownPathImpl(input?.townPath),
					},
					await shellOptions(),
				),
			),
		status: publicProcedure
			.input(convoyStatusInputSchema)
			.query(async ({ input }) =>
				convoyStatusImpl(
					{
						id: input.id,
						townRoot: resolveTownPathImpl(input.townPath),
					},
					await shellOptions(),
				),
			),
	});
};
