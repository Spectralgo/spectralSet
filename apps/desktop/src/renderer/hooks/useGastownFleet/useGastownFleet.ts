import type { Polecat } from "@spectralset/gastown-cli-client";
import { useQuery } from "@tanstack/react-query";
import { useWindowVisibility } from "renderer/hooks/useWindowVisibility";
import { electronTrpcClient } from "renderer/lib/trpc-client";

export const GASTOWN_FLEET_POLL_MS = 10_000;

export interface UseGastownFleetOptions {
	enabled: boolean;
}

export function useGastownFleet({ enabled }: UseGastownFleetOptions) {
	const windowVisible = useWindowVisibility();
	const shouldPoll = enabled && windowVisible;

	return useQuery<Polecat[]>({
		queryKey: ["electron", "gastown", "listPolecats"],
		queryFn: () => electronTrpcClient.gastown.listPolecats.query(),
		enabled,
		refetchInterval: shouldPoll ? GASTOWN_FLEET_POLL_MS : false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
	});
}
