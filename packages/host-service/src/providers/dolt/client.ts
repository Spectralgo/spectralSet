import mysql from "mysql2/promise";

export interface DoltClientOptions {
	host?: string;
	port?: number;
	user?: string;
	password?: string;
	connectionLimit?: number;
}

export interface DatabaseHash {
	database: string;
	hash: string | null;
}

export class DoltClientError extends Error {
	constructor(msg: string, cause?: unknown) {
		super(msg, { cause });
		this.name = "DoltClientError";
	}
}

const SYSTEM_DBS = new Set([
	"information_schema",
	"mysql",
	"performance_schema",
	"sys",
	"dolt_cluster",
]);
const isSystemDb = (n: string) => SYSTEM_DBS.has(n) || n.startsWith("dolt_");
const esc = (n: string) => `\`${n.replace(/`/g, "``")}\``;
const DEFAULT_CONNECTION_LIMIT = 8;
const MIN_CONNECTION_LIMIT = 1;
const MAX_CONNECTION_LIMIT = 32;

type DoltPoolOptions = Parameters<typeof mysql.createPool>[0];

function parseConnectionLimit(
	value: number | string | undefined,
): number | null {
	if (value === undefined) return null;
	const parsed =
		typeof value === "number" ? value : Number.parseInt(value.trim(), 10);
	if (!Number.isFinite(parsed)) return null;
	return Math.trunc(parsed);
}

function clampConnectionLimit(value: number): number {
	return Math.min(MAX_CONNECTION_LIMIT, Math.max(MIN_CONNECTION_LIMIT, value));
}

export function resolveDoltPoolOptions(
	options: Pick<DoltClientOptions, "connectionLimit">,
): DoltPoolOptions {
	const configured =
		parseConnectionLimit(options.connectionLimit) ??
		parseConnectionLimit(process.env.SPECTRALSET_DOLT_CONNECTION_LIMIT) ??
		DEFAULT_CONNECTION_LIMIT;
	const connectionLimit = clampConnectionLimit(configured);
	return {
		connectionLimit,
		waitForConnections: true,
		queueLimit: 0,
		maxIdle: connectionLimit,
		idleTimeout: 60_000,
		enableKeepAlive: true,
		keepAliveInitialDelay: 0,
	};
}

export class DoltClient {
	private readonly opts: Required<
		Pick<DoltClientOptions, "host" | "password" | "port" | "user">
	>;
	private readonly poolOptions: DoltPoolOptions;
	private pool: mysql.Pool | null = null;

	constructor(options: DoltClientOptions = {}) {
		this.opts = {
			host: options.host ?? "127.0.0.1",
			port: options.port ?? 3307,
			user: options.user ?? "root",
			password: options.password ?? "",
		};
		this.poolOptions = resolveDoltPoolOptions(options);
	}

	async connect(): Promise<void> {
		if (this.pool) return;
		try {
			this.pool = mysql.createPool({ ...this.opts, ...this.poolOptions });
			const conn = await this.pool.getConnection();
			conn.release();
		} catch (err) {
			await this.close();
			throw new DoltClientError(
				`Failed to connect to Dolt at ${this.opts.host}:${this.opts.port}`,
				err,
			);
		}
	}

	async close(): Promise<void> {
		const pool = this.pool;
		this.pool = null;
		if (pool) await pool.end().catch(() => {});
	}

	async listDatabases(): Promise<string[]> {
		const pool = this.requirePool();
		try {
			const [rows] = await pool.query("SHOW DATABASES");
			return (rows as Array<Record<string, string>>)
				.map((r) => String(Object.values(r)[0]))
				.filter((n) => !isSystemDb(n));
		} catch (err) {
			throw new DoltClientError("SHOW DATABASES failed", err);
		}
	}

	async hashOfDatabases(databases: string[]): Promise<DatabaseHash[]> {
		const pool = this.requirePool();
		return Promise.all(
			databases.map(async (database) => {
				const conn = await pool.getConnection();
				try {
					await conn.query(`USE ${esc(database)}`);
					const [rows] = await conn.query("SELECT dolt_hashof_db() AS h");
					return {
						database,
						hash: (rows as Array<{ h: string | null }>)[0]?.h ?? null,
					};
				} catch (err) {
					throw new DoltClientError(
						`dolt_hashof_db() failed for "${database}"`,
						err,
					);
				} finally {
					conn.release();
				}
			}),
		);
	}

	async hashOfTable(database: string, table: string): Promise<string | null> {
		const pool = this.requirePool();
		const conn = await pool.getConnection();
		try {
			await conn.query(`USE ${esc(database)}`);
			const [rows] = await conn.query("SELECT dolt_hashof_table(?) AS h", [
				table,
			]);
			return (rows as Array<{ h: string | null }>)[0]?.h ?? null;
		} catch (err) {
			throw new DoltClientError(
				`dolt_hashof_table("${database}","${table}") failed`,
				err,
			);
		} finally {
			conn.release();
		}
	}

	private requirePool(): mysql.Pool {
		if (!this.pool) throw new DoltClientError("DoltClient not connected");
		return this.pool;
	}
}
