import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronTrpcClient } from "renderer/lib/trpc-client";

export type GastownConnectionState = "connected" | "reconnecting" | "offline";

export const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;

const OFFLINE_THRESHOLD_MS = 60_000;
const OFFLINE_FAILURE_COUNT = 3;
const REFRESH_INTERVAL_MS = 5_000;

export interface ConnectionDerivationInput {
	enabled: boolean;
	probeOk: boolean;
	failureCount: number;
	lastSeenAt: number | null;
	now: number;
}

export function deriveConnectionState(
	input: ConnectionDerivationInput,
): GastownConnectionState {
	if (!input.enabled || input.probeOk) return "connected";
	if (input.lastSeenAt === null) {
		return input.failureCount >= OFFLINE_FAILURE_COUNT
			? "offline"
			: "reconnecting";
	}
	const elapsed = input.now - input.lastSeenAt;
	if (
		input.failureCount >= OFFLINE_FAILURE_COUNT ||
		elapsed >= OFFLINE_THRESHOLD_MS
	) {
		return "offline";
	}
	return "reconnecting";
}

export interface UseGastownConnectionStateResult {
	state: GastownConnectionState;
	lastSeenAt: Date | null;
	retryNow: () => void;
	enabled: boolean;
}

export function useGastownConnectionState(): UseGastownConnectionStateResult {
	const enabledQuery = electronTrpc.settings.getGastownEnabled.useQuery();
	const enabled = enabledQuery.data?.enabled ?? false;
	const queryClient = useQueryClient();
	const probeQuery = useQuery({
		queryKey: PROBE_QUERY_KEY,
		queryFn: () => electronTrpcClient.gastown.probe.query(),
		enabled,
		refetchInterval: REFRESH_INTERVAL_MS,
		retry: false,
	});

	const probeOk =
		probeQuery.isSuccess &&
		probeQuery.data?.installed === true &&
		!probeQuery.isError;
	const lastSeenAt = probeQuery.dataUpdatedAt || null;
	const state = deriveConnectionState({
		enabled,
		probeOk,
		failureCount: probeQuery.failureCount,
		lastSeenAt,
		now: Date.now(),
	});

	const retryNow = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: PROBE_QUERY_KEY });
	}, [queryClient]);

	return {
		state,
		lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
		retryNow,
		enabled,
	};
}
