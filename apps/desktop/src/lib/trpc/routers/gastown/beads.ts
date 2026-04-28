import {
	type BeadDetail,
	getBeadDetail,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { discoverTownRoot, resolveTownPath } from "./resolve-town-path";

const townPathSchema = z.string().min(1).optional();

const beadDetailInputSchema = z.object({
	beadId: z.string().min(1),
	townPath: townPathSchema,
});

interface GastownBeadsRouterDeps {
	getBeadDetailFn?: typeof getBeadDetail;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
	discoverTownRootFn?: () => string | undefined;
}

async function shellOptions() {
	return { env: await getProcessEnvWithShellPath() };
}

export const createGastownBeadsRouter = (deps: GastownBeadsRouterDeps = {}) => {
	const getBeadDetailImpl = deps.getBeadDetailFn ?? getBeadDetail;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;
	const discoverTownRootImpl = deps.discoverTownRootFn ?? discoverTownRoot;

	return router({
		detail: publicProcedure.input(beadDetailInputSchema).query(
			async ({ input }): Promise<BeadDetail> =>
				getBeadDetailImpl(
					{
						beadId: input.beadId,
						townRoot:
							resolveTownPathImpl(input.townPath) ?? discoverTownRootImpl(),
					},
					await shellOptions(),
				),
		),
	});
};
