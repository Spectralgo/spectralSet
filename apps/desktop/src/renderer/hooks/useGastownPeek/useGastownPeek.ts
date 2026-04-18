import type { PeekResult } from "@spectralset/gastown-cli-client";
import { useQuery } from "@tanstack/react-query";
import { useWindowVisibility } from "renderer/hooks/useWindowVisibility";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

export const GASTOWN_PEEK_POLL_MS = 5_000;
export const GASTOWN_PEEK_LINES = 30;

export interface UseGastownPeekOptions {
	rig: string;
	polecat: string;
	paused: boolean;
	enabled: boolean;
}

export function useGastownPeek({
	rig,
	polecat,
	paused,
	enabled,
}: UseGastownPeekOptions) {
	const { activeHostUrl } = useLocalHostService();
	const windowVisible = useWindowVisibility();
	const shouldPoll = enabled && !paused && windowVisible && !!activeHostUrl;

	return useQuery<PeekResult>({
		queryKey: [
			"host",
			"gastown",
			"peek",
			activeHostUrl,
			rig,
			polecat,
			GASTOWN_PEEK_LINES,
		],
		queryFn: async () => {
			if (!activeHostUrl) return { output: "" };
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.peek.query({
				rig,
				polecat,
				lines: GASTOWN_PEEK_LINES,
			});
		},
		enabled: enabled && !!activeHostUrl,
		refetchInterval: shouldPoll ? GASTOWN_PEEK_POLL_MS : false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
	});
}
