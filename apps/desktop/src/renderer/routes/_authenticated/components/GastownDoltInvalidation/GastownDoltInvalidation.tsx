import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
	DEFAULT_DATABASE_TO_QUERY_KEYS,
	type DoltSubscriptionTrpcClient,
	mountDoltSubscription,
} from "renderer/lib/gastown";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "../../providers/LocalHostServiceProvider";

interface GastownDoltInvalidationProps {
	enabled: boolean;
}

/**
 * Subscribes to the host-service Dolt change stream and invalidates matching
 * React Query caches so the renderer stays in sync with backend Dolt writes.
 */
export function GastownDoltInvalidation({
	enabled,
}: GastownDoltInvalidationProps) {
	const queryClient = useQueryClient();
	const { activeHostUrl } = useLocalHostService();

	useEffect(() => {
		if (!enabled || !activeHostUrl) return;
		const client = getHostServiceClientByUrl(
			activeHostUrl,
		) as unknown as DoltSubscriptionTrpcClient;
		const cleanup = mountDoltSubscription({
			queryClient,
			trpcClient: client,
			databaseToQueryKeys: DEFAULT_DATABASE_TO_QUERY_KEYS,
		});
		return cleanup;
	}, [enabled, activeHostUrl, queryClient]);

	return null;
}
