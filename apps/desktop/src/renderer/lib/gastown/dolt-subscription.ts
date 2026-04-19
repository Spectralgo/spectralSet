import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface DoltChangeEvent {
	database: string;
	previousHash: string | null;
	currentHash: string;
	changedTables: string[] | null;
	ts: number;
}

type DoltSubscriber = (
	input: undefined,
	opts: {
		onData: (event: DoltChangeEvent) => void;
		onError?: (err: unknown) => void;
	},
) => { unsubscribe: () => void };

export interface DoltSubscriptionTrpcClient {
	gastown: {
		doltChanges: { subscribe: DoltSubscriber };
	};
}

export interface MountDoltSubscriptionArgs {
	queryClient: QueryClient;
	trpcClient: DoltSubscriptionTrpcClient;
	databaseToQueryKeys: Record<string, QueryKey[]>;
}

// Query keys must match prefixes the renderer actually uses. Gastown queries
// live under ["electron", "gastown", ...]; add more as new caches depend on
// a given database.
export const DEFAULT_DATABASE_TO_QUERY_KEYS: Record<string, QueryKey[]> = {
	hq: [
		["electron", "gastown", "reconcile"],
		["electron", "gastown", "probe"],
	],
	spectralSet: [["electron", "gastown", "reconcile"]],
};

export function mountDoltSubscription(
	args: MountDoltSubscriptionArgs,
): () => void {
	const { queryClient, trpcClient, databaseToQueryKeys } = args;
	const sub = trpcClient.gastown.doltChanges.subscribe(undefined, {
		onData: (event) => {
			const keys = databaseToQueryKeys[event.database];
			if (!keys) return;
			for (const queryKey of keys) {
				queryClient.invalidateQueries({ queryKey });
			}
		},
		onError: (err) => {
			console.error("[dolt-subscription] error:", err);
		},
	});
	return () => {
		sub.unsubscribe();
	};
}
