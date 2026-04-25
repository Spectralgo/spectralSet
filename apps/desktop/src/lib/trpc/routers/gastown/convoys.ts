import {
	type Convoy,
	convoyStatus,
	type ListConvoysArgs,
	listConvoys,
} from "@spectralset/gastown-cli-client";
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
	listConvoysCacheStaleMs?: number;
}

async function shellOptions() {
	return { env: await getProcessEnvWithShellPath() };
}

const DEFAULT_LIST_CONVOYS_CACHE_STALE_MS = 10_000;

interface ListConvoysCacheEntry {
	data?: Convoy[];
	updatedAt: number;
	refreshPromise?: Promise<Convoy[]>;
}

function listConvoysCacheKey(args: ListConvoysArgs) {
	return JSON.stringify({
		all: args.all ?? false,
		status: args.status ?? null,
		townRoot: args.townRoot ?? null,
	});
}

export const createGastownConvoysRouter = (
	deps: GastownConvoysRouterDeps = {},
) => {
	const listConvoysImpl = deps.listConvoysFn ?? listConvoys;
	const convoyStatusImpl = deps.convoyStatusFn ?? convoyStatus;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;
	const listConvoysCacheStaleMs =
		deps.listConvoysCacheStaleMs ?? DEFAULT_LIST_CONVOYS_CACHE_STALE_MS;
	const listConvoysCache = new Map<string, ListConvoysCacheEntry>();

	const refreshListConvoys = (
		key: string,
		args: ListConvoysArgs,
		entry: ListConvoysCacheEntry,
	) => {
		if (entry.refreshPromise) return entry.refreshPromise;

		entry.refreshPromise = (async () => {
			const data = await listConvoysImpl(args, await shellOptions());
			entry.data = data;
			entry.updatedAt = Date.now();
			return data;
		})().finally(() => {
			const current = listConvoysCache.get(key);
			if (current === entry) {
				current.refreshPromise = undefined;
			}
		});

		return entry.refreshPromise;
	};

	const listConvoysCached = async (args: ListConvoysArgs) => {
		const key = listConvoysCacheKey(args);
		let entry = listConvoysCache.get(key);
		if (!entry) {
			entry = { updatedAt: 0 };
			listConvoysCache.set(key, entry);
		}

		if (!entry.data) {
			return refreshListConvoys(key, args, entry);
		}

		if (Date.now() - entry.updatedAt >= listConvoysCacheStaleMs) {
			void refreshListConvoys(key, args, entry).catch(() => {
				// Keep serving the last successful result; a later request can retry.
			});
		}

		return entry.data;
	};

	return router({
		list: publicProcedure
			.input(listConvoysInputSchema)
			.query(async ({ input }) =>
				listConvoysCached({
					all: input?.all,
					status: input?.status,
					townRoot: resolveTownPathImpl(input?.townPath),
				}),
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
