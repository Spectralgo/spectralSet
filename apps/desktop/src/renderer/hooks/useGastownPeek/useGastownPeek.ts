import type { PeekResult } from "@spectralset/gastown-cli-client";
import { useQuery } from "@tanstack/react-query";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { useWindowVisibility } from "renderer/hooks/useWindowVisibility";
import { electronTrpcClient } from "renderer/lib/trpc-client";

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
	const windowVisible = useWindowVisibility();
	const townPath = useGastownTownPath();
	const shouldPoll = enabled && !paused && windowVisible;

	return useQuery<PeekResult>({
		queryKey: [
			"electron",
			"gastown",
			"peek",
			rig,
			polecat,
			GASTOWN_PEEK_LINES,
			townPath,
		],
		queryFn: () =>
			electronTrpcClient.gastown.peek.query({
				rig,
				polecat,
				lines: GASTOWN_PEEK_LINES,
				...(townPath ? { townPath } : {}),
			}),
		enabled,
		refetchInterval: shouldPoll ? GASTOWN_PEEK_POLL_MS : false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
	});
}
