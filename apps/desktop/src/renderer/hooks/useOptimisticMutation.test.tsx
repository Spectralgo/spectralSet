import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { buildOptimisticMutation } from "./useOptimisticMutation";

interface Item {
	id: string;
	read: boolean;
}
const KEY = ["items"];

function makeConfig(client: QueryClient) {
	return buildOptimisticMutation<
		{ ok: true },
		Error,
		{ ids: string[] },
		Item[]
	>(client, {
		mutationFn: async () => ({ ok: true }),
		queryKey: KEY,
		applyOptimistic: (prev, v) =>
			prev?.map((x) => (v.ids.includes(x.id) ? { ...x, read: true } : x)),
	});
}

function seed() {
	const client = new QueryClient();
	client.setQueryData<Item[]>(KEY, [
		{ id: "a", read: false },
		{ id: "b", read: false },
	]);
	return client;
}

describe("useOptimisticMutation", () => {
	it("applies optimistic update on mutate, retains it on success", async () => {
		const client = seed();
		const cfg = makeConfig(client);
		await cfg.onMutate({ ids: ["a"] });
		expect(client.getQueryData<Item[]>(KEY)?.[0]?.read).toBe(true);
		cfg.onSuccess({ ok: true }, { ids: ["a"] });
		expect(client.getQueryData<Item[]>(KEY)?.[0]?.read).toBe(true);
	});

	it("rolls back to pre-mutate snapshot on error", async () => {
		const client = seed();
		const cfg = makeConfig(client);
		const ctx = await cfg.onMutate({ ids: ["a"] });
		cfg.onError(new Error("boom"), { ids: ["a"] }, ctx);
		expect(client.getQueryData<Item[]>(KEY)?.[0]?.read).toBe(false);
	});

	it("keeps each in-flight mutate's snapshot independent (no double-apply)", async () => {
		const client = seed();
		const cfg = makeConfig(client);
		await cfg.onMutate({ ids: ["a"] });
		const ctx2 = await cfg.onMutate({ ids: ["b"] });
		cfg.onError(new Error("boom"), { ids: ["b"] }, ctx2);
		const after = client.getQueryData<Item[]>(KEY);
		expect(after?.find((x) => x.id === "a")?.read).toBe(true);
		expect(after?.find((x) => x.id === "b")?.read).toBe(false);
	});
});
