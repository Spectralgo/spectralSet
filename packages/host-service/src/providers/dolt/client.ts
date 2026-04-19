import mysql from "mysql2/promise";

export interface DoltClientOptions {
	host?: string;
	port?: number;
	user?: string;
	password?: string;
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

export class DoltClient {
	private readonly opts: Required<DoltClientOptions>;
	private pool: mysql.Pool | null = null;

	constructor(options: DoltClientOptions = {}) {
		this.opts = {
			host: options.host ?? "127.0.0.1",
			port: options.port ?? 3307,
			user: options.user ?? "root",
			password: options.password ?? "",
		};
	}

	async connect(): Promise<void> {
		if (this.pool) return;
		try {
			this.pool = mysql.createPool({ ...this.opts, connectionLimit: 2 });
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
