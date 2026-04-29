import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { isGastownQueryKey } from "renderer/lib/electron-query-retry";

export interface InflightCounts {
	loading: number;
	stale: number;
	mutating: number;
}

export function countInflight(client: QueryClient): InflightCounts {
	const queries = client
		.getQueryCache()
		.findAll()
		.filter((q) => isGastownQueryKey(q.queryKey));
	const mutations = client
		.getMutationCache()
		.findAll()
		.filter((m) => isGastownQueryKey(m.options.mutationKey ?? []));
	return {
		loading: queries.filter((q) => q.state.fetchStatus === "fetching").length,
		stale: queries.filter(
			(q) => q.state.fetchStatus !== "fetching" && q.isStale(),
		).length,
		mutating: mutations.filter((m) => m.state.status === "pending").length,
	};
}

export function useInflightQueries(): InflightCounts {
	const client = useQueryClient();
	const [counts, setCounts] = useState(() => countInflight(client));
	useEffect(() => {
		const recompute = () => setCounts(countInflight(client));
		const unsubQ = client.getQueryCache().subscribe(recompute);
		const unsubM = client.getMutationCache().subscribe(recompute);
		return () => {
			unsubQ();
			unsubM();
		};
	}, [client]);
	return counts;
}
