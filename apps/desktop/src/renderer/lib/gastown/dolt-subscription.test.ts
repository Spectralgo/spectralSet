import { describe, expect, it, mock } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
	type DoltChangeEvent,
	type DoltSubscriptionTrpcClient,
	getRealtimeStatus,
	mountDoltSubscription,
	type RealtimeStatus,
	subscribeRealtimeStatus,
} from "./dolt-subscription";

function makeFakeClient() {
	let handler: ((event: DoltChangeEvent) => void) | null = null;
	let errorHandler: ((err: unknown) => void) | null = null;
	const unsubscribe = mock(() => {});
	const subscribe = mock(
		(
			_input: undefined,
			opts: {
				onData: (event: DoltChangeEvent) => void;
				onError?: (err: unknown) => void;
			},
		) => {
			handler = opts.onData;
			errorHandler = opts.onError ?? null;
			return { unsubscribe };
		},
	);
	const client: DoltSubscriptionTrpcClient = {
		gastown: { doltChanges: { subscribe } },
	};
	return {
		client,
		emit: (event: DoltChangeEvent) => handler?.(event),
		emitError: (err: unknown) => errorHandler?.(err),
		unsubscribe,
		subscribe,
	};
}

function makeEvent(overrides: Partial<DoltChangeEvent> = {}): DoltChangeEvent {
	return {
		database: "hq",
		previousHash: "a",
		currentHash: "b",
		changedTables: null,
		ts: 0,
		...overrides,
	};
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("mountDoltSubscription", () => {
	it("invalidates every query key mapped to the event database", () => {
		const queryClient = new QueryClient();
		const invalidateSpy = mock(() => Promise.resolve());
		queryClient.invalidateQueries =
			invalidateSpy as unknown as typeof queryClient.invalidateQueries;
		const { client, emit } = makeFakeClient();

		mountDoltSubscription({
			queryClient,
			trpcClient: client,
			databaseToQueryKeys: { hq: [["a"], ["b", "c"]] },
		});
		emit(makeEvent({ database: "hq" }));

		expect(invalidateSpy).toHaveBeenCalledTimes(2);
		const calls = invalidateSpy.mock.calls as unknown as Array<
			[{ queryKey: unknown }]
		>;
		expect(calls[0]?.[0]).toEqual({ queryKey: ["a"] });
		expect(calls[1]?.[0]).toEqual({ queryKey: ["b", "c"] });
	});

	it("ignores events for unmapped databases", () => {
		const queryClient = new QueryClient();
		const invalidateSpy = mock(() => Promise.resolve());
		queryClient.invalidateQueries =
			invalidateSpy as unknown as typeof queryClient.invalidateQueries;
		const { client, emit } = makeFakeClient();

		mountDoltSubscription({
			queryClient,
			trpcClient: client,
			databaseToQueryKeys: { hq: [["x"]] },
		});
		emit(makeEvent({ database: "spectralSet" }));

		expect(invalidateSpy).not.toHaveBeenCalled();
	});

	it("returns a cleanup that unsubscribes", () => {
		const queryClient = new QueryClient();
		const { client, unsubscribe } = makeFakeClient();

		const cleanup = mountDoltSubscription({
			queryClient,
			trpcClient: client,
			databaseToQueryKeys: {},
		});
		cleanup();

		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});

	it("re-subscribes with exponential backoff after onError", async () => {
		const queryClient = new QueryClient();
		const { client, emitError, subscribe, unsubscribe } = makeFakeClient();

		const cleanup = mountDoltSubscription({
			queryClient,
			trpcClient: client,
			databaseToQueryKeys: {},
			timing: {
				initialDelayMs: 5,
				maxDelayMs: 5,
				heartbeatIntervalMs: 1_000_000,
				staleThresholdMs: 1_000_000,
			},
		});

		expect(subscribe).toHaveBeenCalledTimes(1);
		emitError(new Error("boom"));
		await wait(20);
		expect(subscribe).toHaveBeenCalledTimes(2);
		emitError(new Error("again"));
		await wait(20);
		expect(subscribe).toHaveBeenCalledTimes(3);

		cleanup();
		// teardown unsubscribes the latest live sub plus once per error.
		expect(unsubscribe.mock.calls.length).toBeGreaterThanOrEqual(3);
	});

	it("emits realtime-status transitions for listeners", async () => {
		const queryClient = new QueryClient();
		const { client, emit, emitError } = makeFakeClient();
		const seen: RealtimeStatus[] = [];
		const stopWatching = subscribeRealtimeStatus((s) => seen.push(s));

		const cleanup = mountDoltSubscription({
			queryClient,
			trpcClient: client,
			databaseToQueryKeys: { hq: [["a"]] },
			timing: {
				initialDelayMs: 5,
				maxDelayMs: 5,
				heartbeatIntervalMs: 1_000_000,
				staleThresholdMs: 1_000_000,
			},
		});

		emit(makeEvent({ database: "hq" }));
		emitError(new Error("drop"));
		await wait(20);

		expect(seen).toContain("connecting");
		expect(seen).toContain("connected");
		expect(seen).toContain("disconnected");
		expect(["connecting", "connected"]).toContain(getRealtimeStatus());

		cleanup();
		stopWatching();
	});

	it("forces reconnect when no events arrive within the stale threshold", async () => {
		const queryClient = new QueryClient();
		const { client, subscribe } = makeFakeClient();

		const cleanup = mountDoltSubscription({
			queryClient,
			trpcClient: client,
			databaseToQueryKeys: {},
			timing: {
				initialDelayMs: 1,
				maxDelayMs: 1,
				heartbeatIntervalMs: 5,
				staleThresholdMs: 1,
			},
		});

		await wait(30);
		expect(subscribe.mock.calls.length).toBeGreaterThanOrEqual(2);
		cleanup();
	});
});
