import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
	GASTOWN_PROBE_QUERY_KEY,
	useGastownProbe,
} from "renderer/hooks/useGastownProbe";
import { electronTrpc } from "renderer/lib/electron-trpc";

export type GastownConnectionState = "connected" | "reconnecting" | "offline";

const OFFLINE_THRESHOLD_MS = 60_000;
const OFFLINE_FAILURE_COUNT = 3;

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
	const probe = useGastownProbe({ enabled });

	const probeOk =
		probe.data !== undefined &&
		probe.data.installed === true &&
		probe.error === null;
	const state = deriveConnectionState({
		enabled,
		probeOk,
		failureCount: probe.query.failureCount,
		lastSeenAt: probe.lastSeenAt,
		now: Date.now(),
	});

	const retryNow = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: GASTOWN_PROBE_QUERY_KEY });
	}, [queryClient]);

	return {
		state,
		lastSeenAt: probe.lastSeenAt ? new Date(probe.lastSeenAt) : null,
		retryNow,
		enabled,
	};
}
