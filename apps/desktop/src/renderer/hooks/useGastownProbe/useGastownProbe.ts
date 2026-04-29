import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWindowVisibility } from "renderer/hooks/useWindowVisibility";
import { electronTrpcClient } from "renderer/lib/trpc-client";

export const GASTOWN_PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;
export const GASTOWN_PROBE_BASE_INTERVAL_MS = 10_000;
export const GASTOWN_PROBE_MAX_INTERVAL_MS = 60_000;
const OFFLINE_FAILURE_THRESHOLD = 3;

/**
 * Exponential backoff between polls: 10s → 20s → 40s → 60s (cap).
 * `failureCount` is the consecutive-failed-poll counter from react-query;
 * it resets to 0 on any successful fetch.
 */
export function nextProbeInterval(
	failureCount: number,
	base = GASTOWN_PROBE_BASE_INTERVAL_MS,
	cap = GASTOWN_PROBE_MAX_INTERVAL_MS,
): number {
	if (failureCount <= 0) return base;
	return Math.min(base * 2 ** failureCount, cap);
}

export function deriveProbeStatus(input: {
	failureCount: number;
	hasData: boolean;
}): ProbeStatus {
	if (input.failureCount >= OFFLINE_FAILURE_THRESHOLD) return "offline";
	if (input.failureCount > 0) return "reconnecting";
	return input.hasData ? "connected" : "reconnecting";
}

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
	const visible = useWindowVisibility();
	const shouldPoll = enabled && visible;

	const query = useQuery<GastownProbe>({
		queryKey: GASTOWN_PROBE_QUERY_KEY,
		queryFn: () => electronTrpcClient.gastown.probe.query(),
		enabled,
		// retry: false → one fetch attempt per refetchInterval tick, so
		// failureCount tracks consecutive failed polls (not within-fetch retries).
		retry: false,
		refetchInterval: shouldPoll
			? (q) => nextProbeInterval(q.state.fetchFailureCount)
			: false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
	});

	// On window re-show, refetch immediately if our last successful read is
	// stale — otherwise the user stares at data older than the poll cadence
	// while the next refetchInterval tick is queued.
	useEffect(() => {
		if (!visible || !enabled) return;
		const last = query.dataUpdatedAt;
		if (last > 0 && Date.now() - last > GASTOWN_PROBE_BASE_INTERVAL_MS) {
			void query.refetch();
		}
	}, [visible, enabled, query.dataUpdatedAt, query.refetch]);

	const status = deriveProbeStatus({
		failureCount: query.failureCount,
		hasData: query.data !== undefined,
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: (query.error as Error | null) ?? null,
		status,
		lastSeenAt: query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null,
		query,
	};
}
