import { describe, expect, it, mock } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
	type DoltChangeEvent,
	type DoltSubscriptionTrpcClient,
	mountDoltSubscription,
} from "./dolt-subscription";

function makeFakeClient() {
	let handler: ((event: DoltChangeEvent) => void) | null = null;
	const unsubscribe = mock(() => {});
	const client: DoltSubscriptionTrpcClient = {
		gastown: {
			doltChanges: {
				subscribe: (_input, opts) => {
					handler = opts.onData;
					return { unsubscribe };
				},
			},
		},
	};
	return {
		client,
		emit: (event: DoltChangeEvent) => handler?.(event),
		unsubscribe,
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
			databaseToQueryKeys: {
				hq: [["a"], ["b", "c"]],
			},
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
});
