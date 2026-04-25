import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface DoltChangeEvent {
	database: string;
	previousHash: string | null;
	currentHash: string;
	changedTables: string[] | null;
	ts: number;
}

type DoltSubscriber = (
	input: undefined,
	opts: {
		onData: (event: DoltChangeEvent) => void;
		onError?: (err: unknown) => void;
	},
) => { unsubscribe: () => void };

export interface DoltSubscriptionTrpcClient {
	gastown: {
		doltChanges: { subscribe: DoltSubscriber };
	};
}

export type RealtimeStatus = "connecting" | "connected" | "disconnected";
type StatusListener = (status: RealtimeStatus) => void;

let currentStatus: RealtimeStatus = "connecting";
const statusListeners = new Set<StatusListener>();

function setStatus(next: RealtimeStatus): void {
	if (currentStatus === next) return;
	currentStatus = next;
	for (const listener of statusListeners) listener(next);
}

export function getRealtimeStatus(): RealtimeStatus {
	return currentStatus;
}

export function subscribeRealtimeStatus(listener: StatusListener): () => void {
	statusListeners.add(listener);
	listener(currentStatus);
	return () => {
		statusListeners.delete(listener);
	};
}

export interface MountDoltSubscriptionArgs {
	queryClient: QueryClient;
	trpcClient: DoltSubscriptionTrpcClient;
	databaseToQueryKeys: Record<string, QueryKey[]>;
	timing?: {
		initialDelayMs?: number;
		maxDelayMs?: number;
		heartbeatIntervalMs?: number;
		staleThresholdMs?: number;
	};
}

// Query keys must match prefixes the renderer actually uses. Gastown queries
// live under ["electron", "gastown", ...]; add more as new caches depend on
// a given database.
export const DEFAULT_DATABASE_TO_QUERY_KEYS: Record<string, QueryKey[]> = {
	hq: [
		["electron", "gastown", "reconcile"],
		["electron", "gastown", "probe"],
	],
	spectralSet: [["electron", "gastown", "reconcile"]],
};

export function mountDoltSubscription(
	args: MountDoltSubscriptionArgs,
): () => void {
	const { queryClient, trpcClient, databaseToQueryKeys, timing } = args;
	const initialDelayMs = timing?.initialDelayMs ?? 1_000;
	const maxDelayMs = timing?.maxDelayMs ?? 30_000;
	const heartbeatIntervalMs = timing?.heartbeatIntervalMs ?? 60_000;
	const staleThresholdMs = timing?.staleThresholdMs ?? 180_000;

	let stopped = false;
	let attempt = 0;
	let lastEventAt = Date.now();
	let activeSub: { unsubscribe: () => void } | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	const teardown = () => {
		if (!activeSub) return;
		const sub = activeSub;
		activeSub = null;
		sub.unsubscribe();
	};

	const scheduleReconnect = () => {
		if (stopped || reconnectTimer !== null) return;
		const delay = Math.min(initialDelayMs * 2 ** attempt, maxDelayMs);
		attempt += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, delay);
	};

	const connect = () => {
		if (stopped) return;
		teardown();
		setStatus("connecting");
		lastEventAt = Date.now();
		activeSub = trpcClient.gastown.doltChanges.subscribe(undefined, {
			onData: (event) => {
				attempt = 0;
				lastEventAt = Date.now();
				setStatus("connected");
				const keys = databaseToQueryKeys[event.database];
				if (!keys) return;
				for (const queryKey of keys) {
					queryClient.invalidateQueries({ queryKey });
				}
			},
			onError: (err) => {
				console.error("[dolt-subscription] error:", err);
				setStatus("disconnected");
				teardown();
				scheduleReconnect();
			},
		});
		// trpc-electron resolves the subscribe call once the IPC handshake is
		// established; treat that as connected until we observe otherwise.
		setStatus("connected");
	};

	connect();
	const heartbeatTimer = setInterval(() => {
		if (stopped) return;
		if (Date.now() - lastEventAt > staleThresholdMs) {
			setStatus("disconnected");
			teardown();
			attempt = 0;
			connect();
		}
	}, heartbeatIntervalMs);

	return () => {
		stopped = true;
		clearInterval(heartbeatTimer);
		if (reconnectTimer !== null) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		teardown();
	};
}
