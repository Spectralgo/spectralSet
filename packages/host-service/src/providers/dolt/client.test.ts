import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
} from "bun:test";
import { DoltClient, DoltClientError, resolveDoltPoolOptions } from "./client";

const HOST = "127.0.0.1";
const PORT = 3307;
const ORIGINAL_DOLT_CONNECTION_LIMIT =
	process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT;

afterEach(() => {
	if (ORIGINAL_DOLT_CONNECTION_LIMIT === undefined) {
		delete process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT;
		return;
	}
	process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT =
		ORIGINAL_DOLT_CONNECTION_LIMIT;
});

async function probe(): Promise<boolean> {
	const c = new DoltClient({ host: HOST, port: PORT });
	try {
		await c.connect();
		await c.close();
		return true;
	} catch {
		await c.close().catch(() => {});
		return false;
	}
}

const reachable = await probe();
const describeIf = reachable ? describe : describe.skip;

describeIf("DoltClient (integration)", () => {
	const client = new DoltClient({ host: HOST, port: PORT });
	beforeAll(() => client.connect());
	afterAll(() => client.close());

	test("listDatabases() returns user dbs, filters system dbs", async () => {
		const dbs = await client.listDatabases();
		expect(dbs.length).toBeGreaterThan(0);
		for (const n of dbs) {
			expect([
				"information_schema",
				"mysql",
				"performance_schema",
				"sys",
			]).not.toContain(n);
			expect(n.startsWith("dolt_")).toBe(false);
		}
	});

	test("hashOfDatabases() returns hash for a real db", async () => {
		const dbs = await client.listDatabases();
		const target = dbs.includes("hq") ? "hq" : dbs[0];
		if (!target) throw new Error("no dbs");
		const results = await client.hashOfDatabases([target]);
		expect(results).toHaveLength(1);
		expect(results[0]?.database).toBe(target);
		expect(results[0]?.hash?.length ?? 0).toBeGreaterThanOrEqual(20);
		expect(results[0]?.hash).toMatch(/^[0-9a-z]+$/i);
	});

	test("hashOfTable() returns a hash", async () => {
		const dbs = await client.listDatabases();
		const db = dbs.includes("hq") ? "hq" : dbs[0];
		if (!db) throw new Error("no dbs");
		const pool = (client as unknown as { pool: import("mysql2/promise").Pool })
			.pool;
		const [tables] = await pool.query(
			"SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? LIMIT 1",
			[db],
		);
		const tableName = (tables as Array<{ t: string }>)[0]?.t;
		if (!tableName) return;
		const hash = await client.hashOfTable(db, tableName);
		expect(hash).toMatch(/^[0-9a-z]+$/i);
	});

	test("close() is idempotent", async () => {
		const c = new DoltClient({ host: HOST, port: PORT });
		await c.connect();
		await c.close();
		await c.close();
	});
});

describe("DoltClient (unit)", () => {
	test("defaults to a less restrictive bounded pool", () => {
		const opts = resolveDoltPoolOptions({});
		expect(opts.connectionLimit).toBe(8);
		expect(opts.waitForConnections).toBe(true);
		expect(opts.queueLimit).toBe(0);
		expect(opts.maxIdle).toBe(8);
		expect(opts.idleTimeout).toBeGreaterThan(0);
		expect(opts.enableKeepAlive).toBe(true);
	});

	test("uses explicit connection limit before env and clamps unsafe values", () => {
		process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT = "12";
		expect(resolveDoltPoolOptions({ connectionLimit: 6 }).connectionLimit).toBe(
			6,
		);
		expect(
			resolveDoltPoolOptions({ connectionLimit: 999 }).connectionLimit,
		).toBe(32);
		expect(resolveDoltPoolOptions({ connectionLimit: 0 }).connectionLimit).toBe(
			1,
		);
		delete process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT;
	});

	test("uses SPECTRALSET_DOLT_CONNECTION_LIMIT when no option is provided", () => {
		process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT = "10";
		expect(resolveDoltPoolOptions({}).connectionLimit).toBe(10);
		delete process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT;
	});

	test("throws DoltClientError on unreachable host", async () => {
		const c = new DoltClient({ host: "127.0.0.1", port: 1 });
		await expect(c.connect()).rejects.toBeInstanceOf(DoltClientError);
	});

	test("methods throw if called before connect()", async () => {
		const c = new DoltClient({ host: HOST, port: PORT });
		await expect(c.listDatabases()).rejects.toBeInstanceOf(DoltClientError);
	});
});
