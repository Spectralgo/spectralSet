import type { AppRouter } from "@spectralset/host-service";
import {
	createTRPCClient,
	httpBatchLink,
	httpSubscriptionLink,
	splitLink,
} from "@trpc/client";
import superjson from "superjson";
import { getHostServiceHeaders } from "./host-service-auth";

const clientCache = new Map<
	string,
	ReturnType<typeof createTRPCClient<AppRouter>>
>();

export type HostServiceClient = ReturnType<typeof createTRPCClient<AppRouter>>;

export function getHostServiceClient(port: number): HostServiceClient {
	return getHostServiceClientByUrl(`http://127.0.0.1:${port}`);
}

export function getHostServiceClientByUrl(hostUrl: string): HostServiceClient {
	const cached = clientCache.get(hostUrl);
	if (cached) return cached;

	const trpcUrl = `${hostUrl}/trpc`;
	const client = createTRPCClient<AppRouter>({
		links: [
			splitLink({
				condition: (op) => op.type === "subscription",
				true: httpSubscriptionLink({
					url: trpcUrl,
					transformer: superjson,
				}),
				false: httpBatchLink({
					url: trpcUrl,
					transformer: superjson,
					headers: () => getHostServiceHeaders(hostUrl),
				}),
			}),
		],
	});

	clientCache.set(hostUrl, client);
	return client;
}
