import { toast } from "@spectralset/ui/sonner";
import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import {
	createGastownToastCoalescer,
	nextRetryDelay,
	shouldRetryQuery,
} from "renderer/lib/electron-query-retry";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronReactClient } from "../../lib/trpc-client";

// gastown.* queries opt into exponential-backoff retry (10s/20s/40s/60s/60s)
// because `gt` is an external CLI that the user can kill/restart at will.
// Per-query overrides (e.g. useGastownProbe sets `retry: false`) still win.
// Mutations stay at `retry: false` — replaying mail.send / nuke / convoy.create
// is an idempotency hazard.
const coalescer = createGastownToastCoalescer(toast);

const queryCache = new QueryCache({
	onError: (_err, query) => coalescer.onQueryError(query.queryKey),
	onSuccess: (_data, query) => coalescer.onQuerySuccess(query.queryKey),
});

const queryClient = new QueryClient({
	queryCache,
	defaultOptions: {
		queries: {
			networkMode: "always",
			retry: shouldRetryQuery,
			retryDelay: nextRetryDelay,
		},
		mutations: {
			networkMode: "always",
			retry: false,
		},
	},
});

/**
 * Provider for Electron IPC tRPC client.
 * QueryClient is shared with router context for loader prefetching.
 */
export function ElectronTRPCProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<electronTrpc.Provider
			client={electronReactClient}
			queryClient={queryClient}
		>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</electronTrpc.Provider>
	);
}

// Export for router context
export { queryClient as electronQueryClient };
