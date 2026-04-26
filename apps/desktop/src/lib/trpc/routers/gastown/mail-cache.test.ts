import { describe, expect, test } from "bun:test";
import type { MailMessage } from "@spectralset/gastown-cli-client";
import { createMailInboxCache } from "./mail-cache";

function message(id: string): MailMessage {
	return {
		id,
		from: "overseer",
		to: "mayor/",
		subject: id,
		body: "",
		timestamp: "2026-04-26T00:00:00Z",
		read: false,
		priority: "normal",
		type: "notification",
	};
}

describe("createMailInboxCache", () => {
	test("serves fresh cached inboxes without re-running listInbox", async () => {
		let calls = 0;
		const cache = createMailInboxCache({
			listInboxFn: async () => {
				calls += 1;
				return [message(`m${calls}`)];
			},
			resolveTownPathFn: (townPath) => townPath,
			shellOptionsFn: async () => ({}),
			staleMs: 10_000,
			now: () => 1_000,
		});

		await expect(
			cache.list({ address: "mayor/", townPath: "/town" }),
		).resolves.toEqual([message("m1")]);
		await expect(
			cache.list({ address: "mayor/", townPath: "/town" }),
		).resolves.toEqual([message("m1")]);
		expect(calls).toBe(1);
	});

	test("returns stale data immediately while refreshing in the background", async () => {
		let calls = 0;
		let now = 1_000;
		let resolveRefresh: (messages: MailMessage[]) => void = () => {};
		let refreshDone: Promise<void> = Promise.resolve();
		const cache = createMailInboxCache({
			listInboxFn: async () => {
				calls += 1;
				if (calls === 1) return [message("old")];
				let done: () => void = () => {};
				refreshDone = new Promise<void>((resolve) => {
					done = resolve;
				});
				return new Promise<MailMessage[]>((innerResolve) => {
					resolveRefresh = (messages) => {
						innerResolve(messages);
						setTimeout(done, 0);
					};
				});
			},
			resolveTownPathFn: (townPath) => townPath,
			shellOptionsFn: async () => ({}),
			staleMs: 10,
			now: () => now,
		});

		expect(await cache.list({ address: "mayor/", townPath: "/town" })).toEqual([
			message("old"),
		]);
		now = 2_000;
		expect(await cache.list({ address: "mayor/", townPath: "/town" })).toEqual([
			message("old"),
		]);

		expect(calls).toBe(2);
		resolveRefresh([message("new")]);
		await refreshDone;
		now = 2_001;
		expect(await cache.list({ address: "mayor/", townPath: "/town" })).toEqual([
			message("new"),
		]);
	});

	test("clear forces the next read to refill the cache", async () => {
		let calls = 0;
		const cache = createMailInboxCache({
			listInboxFn: async () => {
				calls += 1;
				return [message(`m${calls}`)];
			},
			resolveTownPathFn: (townPath) => townPath,
			shellOptionsFn: async () => ({}),
			staleMs: 10_000,
			now: () => 1_000,
		});

		expect(await cache.list({ address: "mayor/" })).toEqual([message("m1")]);
		cache.clear();
		expect(await cache.list({ address: "mayor/" })).toEqual([message("m2")]);
	});
});
