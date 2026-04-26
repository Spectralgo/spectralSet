import { describe, expect, test } from "bun:test";
import type { DoltClient } from "./client";
import { type DoltChangeEvent, DoltWatcher } from "./watcher";

interface FakeClientOptions {
	hashes: Array<Array<{ database: string; hash: string | null }>>;
	databases?: string[];
	tableHash?: string | null;
	tableThrows?: boolean;
	hashOfDatabasesCalls?: string[][];
	hashOfTableCalls?: Array<{ database: string; table: string }>;
}

function makeFakeClient(opts: FakeClientOptions): DoltClient {
	let tickIndex = 0;
	const fake = {
		connect: async () => {},
		close: async () => {},
		listDatabases: async () => opts.databases ?? ["dbA"],
		hashOfDatabases: async (databases: string[]) => {
			opts.hashOfDatabasesCalls?.push(databases);
			const idx = Math.min(tickIndex, opts.hashes.length - 1);
			tickIndex += 1;
			return opts.hashes[idx] ?? [];
		},
		hashOfTable: async (database: string, table: string) => {
			opts.hashOfTableCalls?.push({ database, table });
			if (opts.tableThrows) throw new Error("table hash failed");
			return opts.tableHash ?? null;
		},
	};
	return fake as unknown as DoltClient;
}

function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
	return new Promise((resolve, reject) => {
		const start = Date.now();
		const id = setInterval(() => {
			if (predicate()) {
				clearInterval(id);
				resolve();
			} else if (Date.now() - start > timeoutMs) {
				clearInterval(id);
				reject(new Error("waitFor timeout"));
			}
		}, 5);
	});
}

describe("DoltWatcher", () => {
	test("fires event with previous + current hash on change", async () => {
		const client = makeFakeClient({
			hashes: [
				[{ database: "dbA", hash: "A" }],
				[{ database: "dbA", hash: "B" }],
				[{ database: "dbA", hash: "B" }],
			],
			tableHash: "t1",
		});
		const watcher = new DoltWatcher(client, { intervalMs: 5, jitterMs: 0 });
		const events: DoltChangeEvent[] = [];
		watcher.on((e) => events.push(e));
		watcher.start();
		await waitFor(() => events.length >= 1);
		await watcher.stop();
		expect(events).toHaveLength(1);
		expect(events[0]?.database).toBe("dbA");
		expect(events[0]?.previousHash).toBe("A");
		expect(events[0]?.currentHash).toBe("B");
		expect(Array.isArray(events[0]?.changedTables)).toBe(true);
	});

	test("stop() prevents events from firing after it resolves", async () => {
		const client = makeFakeClient({
			hashes: [
				[{ database: "dbA", hash: "A" }],
				[{ database: "dbA", hash: "B" }],
				[{ database: "dbA", hash: "C" }],
			],
		});
		const watcher = new DoltWatcher(client, { intervalMs: 5, jitterMs: 0 });
		const events: DoltChangeEvent[] = [];
		watcher.on((e) => events.push(e));
		watcher.start();
		await watcher.stop();
		const before = events.length;
		await new Promise((r) => setTimeout(r, 50));
		expect(events.length).toBe(before);
	});

	test("narrow returns null when hashOfTable throws", async () => {
		const client = makeFakeClient({
			hashes: [
				[{ database: "dbA", hash: "A" }],
				[{ database: "dbA", hash: "B" }],
			],
			tableThrows: true,
		});
		const watcher = new DoltWatcher(client, { intervalMs: 5, jitterMs: 0 });
		const events: DoltChangeEvent[] = [];
		watcher.on((e) => events.push(e));
		watcher.start();
		await waitFor(() => events.length >= 1);
		await watcher.stop();
		expect(events[0]?.changedTables).toBeNull();
	});

	test("filters to active databases and only narrows after a DB hash changes", async () => {
		const hashOfDatabasesCalls: string[][] = [];
		const hashOfTableCalls: Array<{ database: string; table: string }> = [];
		const client = makeFakeClient({
			databases: ["dbA", "dbB", "dbC"],
			hashes: [
				[{ database: "dbB", hash: "A" }],
				[{ database: "dbB", hash: "A" }],
				[{ database: "dbB", hash: "B" }],
			],
			tableHash: "t1",
			hashOfDatabasesCalls,
			hashOfTableCalls,
		});
		const watcher = new DoltWatcher(client, {
			intervalMs: 5,
			jitterMs: 0,
			activeDatabases: ["dbB"],
			narrowTables: ["issues"],
		});
		const events: DoltChangeEvent[] = [];
		watcher.on((e) => events.push(e));
		watcher.start();
		await waitFor(() => events.length >= 1);
		await watcher.stop();

		expect(hashOfDatabasesCalls.length).toBeGreaterThanOrEqual(3);
		expect(hashOfDatabasesCalls).toEqual(
			hashOfDatabasesCalls.map(() => ["dbB"]),
		);
		expect(hashOfTableCalls).toEqual([{ database: "dbB", table: "issues" }]);
		expect(events).toHaveLength(1);
	});

	test("uses the lower idle cadence when database hashes stay unchanged", async () => {
		const hashOfDatabasesCalls: string[][] = [];
		const client = makeFakeClient({
			hashes: [[{ database: "dbA", hash: "A" }]],
			hashOfDatabasesCalls,
		});
		const watcher = new DoltWatcher(client, {
			intervalMs: 5,
			idleIntervalMs: 30,
			jitterMs: 0,
		});
		watcher.start();
		await new Promise((r) => setTimeout(r, 22));
		await watcher.stop();

		expect(hashOfDatabasesCalls.length).toBeLessThanOrEqual(2);
	});

	test("unsubscribe removes the listener", async () => {
		const client = makeFakeClient({
			hashes: [
				[{ database: "dbA", hash: "A" }],
				[{ database: "dbA", hash: "B" }],
			],
		});
		const watcher = new DoltWatcher(client, { intervalMs: 5, jitterMs: 0 });
		let count = 0;
		const unsub = watcher.on(() => {
			count += 1;
		});
		unsub();
		watcher.start();
		await new Promise((r) => setTimeout(r, 40));
		await watcher.stop();
		expect(count).toBe(0);
	});
});
