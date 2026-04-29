import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { electronTrpcClient } from "renderer/lib/trpc-client";

export const GASTOWN_PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;
export const GASTOWN_PROBE_BASE_INTERVAL_MS = 10_000;

export type GastownProbe = Awaited<
	ReturnType<typeof electronTrpcClient.gastown.probe.query>
>;

export type ProbeStatus = "connected" | "reconnecting" | "offline";

export interface UseGastownProbeOptions {
	enabled?: boolean;
}

export interface UseGastownProbeResult {
	data: GastownProbe | undefined;
	isLoading: boolean;
	error: Error | null;
	status: ProbeStatus;
	lastSeenAt: number | null;
	query: UseQueryResult<GastownProbe>;
}

export function useGastownProbe(
	options: UseGastownProbeOptions = {},
): UseGastownProbeResult {
	const { enabled = true } = options;

	const query = useQuery<GastownProbe>({
		queryKey: GASTOWN_PROBE_QUERY_KEY,
		queryFn: () => electronTrpcClient.gastown.probe.query(),
		enabled,
		refetchInterval: GASTOWN_PROBE_BASE_INTERVAL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
	});

	const status: ProbeStatus = query.isError
		? "reconnecting"
		: query.data !== undefined
			? "connected"
			: "reconnecting";

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: (query.error as Error | null) ?? null,
		status,
		lastSeenAt: query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null,
		query,
	};
}
