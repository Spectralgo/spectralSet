import { describe, expect, test } from "bun:test";
import type { Convoy } from "@spectralset/gastown-cli-client";
import { createGastownConvoysRouter } from "./convoys";

function convoy(overrides: Partial<Convoy> & Pick<Convoy, "id">): Convoy {
	return {
		id: overrides.id,
		title: overrides.title ?? `Convoy ${overrides.id}`,
		status: overrides.status ?? "open",
		created_at: overrides.created_at ?? "2026-04-25T00:00:00Z",
		tracked: overrides.tracked ?? [],
		completed: overrides.completed,
		total: overrides.total,
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});
	return { promise, resolve, reject };
}

async function waitFor(predicate: () => boolean) {
	for (let attempt = 0; attempt < 3000; attempt += 1) {
		if (predicate()) return;
		await new Promise((resolve) => setTimeout(resolve, 1));
	}
	throw new Error("timed out waiting for condition");
}

describe("gastownConvoys.list cache", () => {
	test("shares one backend call for duplicate cold requests", async () => {
		const pending = deferred<Convoy[]>();
		let calls = 0;
		const router = createGastownConvoysRouter({
			listConvoysFn: async () => {
				calls += 1;
				return pending.promise;
			},
			resolveTownPathFn: () => "/town",
		});
		const caller = router.createCaller({});

		const first = caller.list({ townPath: "/town" });
		const second = caller.list({ townPath: "/town" });
		await waitFor(() => calls > 0);
		await Promise.resolve();

		expect(calls).toBe(1);

		pending.resolve([convoy({ id: "ss-jn0f" })]);
		await expect(Promise.all([first, second])).resolves.toEqual([
			[convoy({ id: "ss-jn0f" })],
			[convoy({ id: "ss-jn0f" })],
		]);
		expect(calls).toBe(1);
	});

	test("returns cached data while a warm refresh is in flight", async () => {
		const refresh = deferred<Convoy[]>();
		let calls = 0;
		const router = createGastownConvoysRouter({
			listConvoysFn: async () => {
				calls += 1;
				if (calls === 1) return [convoy({ id: "cached" })];
				return refresh.promise;
			},
			listConvoysCacheStaleMs: 0,
			resolveTownPathFn: () => "/town",
		});
		const caller = router.createCaller({});

		await expect(caller.list({ townPath: "/town" })).resolves.toEqual([
			convoy({ id: "cached" }),
		]);

		const warmRequest = caller.list({ townPath: "/town" });
		await waitFor(() => calls > 1);
		const result = await Promise.race([
			warmRequest.then((value) => ({ kind: "value" as const, value })),
			new Promise<{ kind: "pending" }>((resolve) =>
				setTimeout(() => resolve({ kind: "pending" }), 25),
			),
		]);

		expect(calls).toBe(2);
		expect(result).toEqual({
			kind: "value",
			value: [convoy({ id: "cached" })],
		});

		refresh.resolve([convoy({ id: "fresh" })]);
		await Promise.resolve();

		await expect(caller.list({ townPath: "/town" })).resolves.toEqual([
			convoy({ id: "fresh" }),
		]);
		expect(calls).toBe(3);
	});
});
