import {
	type Convoy,
	type ConvoyBead,
	convoyStatus,
	createConvoy,
	deriveBeadStatus,
	getConvoyBeads,
	type ListConvoysArgs,
	listConvoys,
	updateConvoyBeadStatus,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { discoverTownRoot, resolveTownPath } from "./resolve-town-path";

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

const convoyBeadsInputSchema = z.object({
	convoyId: z.string().min(1),
	townPath: townPathSchema,
});

const createConvoyInputSchema = z.object({
	name: z.string().trim().min(1).max(100),
	issueIds: z.array(z.string().trim().min(1)).min(1).max(50),
	owned: z.boolean().optional(),
	mergeStrategy: z.enum(["direct", "mr", "local"]).optional(),
	townPath: townPathSchema,
});

const updateBeadStatusInputSchema = z.object({
	convoyId: z.string().min(1),
	beadId: z.string().min(1),
	status: z.enum(["open", "hooked", "closed"]),
	townPath: townPathSchema,
});

interface BeadDep {
	from: string;
	to: string;
	type: string;
}

interface GastownConvoysRouterDeps {
	listConvoysFn?: typeof listConvoys;
	convoyStatusFn?: typeof convoyStatus;
	getConvoyBeadsFn?: typeof getConvoyBeads;
	createConvoyFn?: typeof createConvoy;
	updateConvoyBeadStatusFn?: typeof updateConvoyBeadStatus;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
	discoverTownRootFn?: () => string | undefined;
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
	const getConvoyBeadsImpl = deps.getConvoyBeadsFn ?? getConvoyBeads;
	const createConvoyImpl = deps.createConvoyFn ?? createConvoy;
	const updateConvoyBeadStatusImpl =
		deps.updateConvoyBeadStatusFn ?? updateConvoyBeadStatus;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;
	const discoverTownRootImpl = deps.discoverTownRootFn ?? discoverTownRoot;
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
						townRoot:
							resolveTownPathImpl(input.townPath) ?? discoverTownRootImpl(),
					},
					await shellOptions(),
				),
			),
		create: publicProcedure
			.input(createConvoyInputSchema)
			.mutation(async ({ input }) => {
				const townRoot =
					resolveTownPathImpl(input.townPath) ?? discoverTownRootImpl();
				const result = await createConvoyImpl(
					{
						name: input.name,
						issueIds: input.issueIds,
						owned: input.owned,
						mergeStrategy: input.mergeStrategy,
						townRoot,
					},
					await shellOptions(),
				);
				listConvoysCache.clear();
				return result;
			}),
		beads: publicProcedure
			.input(convoyBeadsInputSchema)
			.query(
				async ({
					input,
				}): Promise<{ beads: ConvoyBead[]; dependencies: BeadDep[] }> => {
					const townRoot =
						resolveTownPathImpl(input.townPath) ?? discoverTownRootImpl();
					const opts = await shellOptions();
					try {
						const beads = await getConvoyBeadsImpl(
							{ convoyId: input.convoyId, townRoot },
							opts,
						);
						return { beads, dependencies: [] };
					} catch {
						const status = await convoyStatusImpl(
							{ id: input.convoyId, townRoot },
							opts,
						);
						const beads = status.tracked.map<ConvoyBead>((t) => ({
							id: t.id,
							title: t.title,
							status: deriveBeadStatus(t.status),
							assignee: null,
							priority: 0,
						}));
						return { beads, dependencies: [] };
					}
				},
			),
		updateBeadStatus: publicProcedure
			.input(updateBeadStatusInputSchema)
			.mutation(async ({ input }) => {
				const townRoot =
					resolveTownPathImpl(input.townPath) ?? discoverTownRootImpl();
				await updateConvoyBeadStatusImpl(
					{
						beadId: input.beadId,
						status: input.status,
						townRoot,
					},
					await shellOptions(),
				);
				listConvoysCache.clear();
				return { ok: true as const };
			}),
	});
};
