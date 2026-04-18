import type { Polecat } from "@spectralset/gastown-cli-client";
import { useQuery } from "@tanstack/react-query";
import { useWindowVisibility } from "renderer/hooks/useWindowVisibility";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

export const GASTOWN_FLEET_POLL_MS = 10_000;

export interface UseGastownFleetOptions {
	enabled: boolean;
}

export function useGastownFleet({ enabled }: UseGastownFleetOptions) {
	const { activeHostUrl } = useLocalHostService();
	const windowVisible = useWindowVisibility();
	const shouldPoll = enabled && windowVisible && !!activeHostUrl;

	return useQuery<Polecat[]>({
		queryKey: ["host", "gastown", "listPolecats", activeHostUrl],
		queryFn: async () => {
			if (!activeHostUrl) return [];
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.listPolecats.query();
		},
		enabled: enabled && !!activeHostUrl,
		refetchInterval: shouldPoll ? GASTOWN_FLEET_POLL_MS : false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
	});
}
