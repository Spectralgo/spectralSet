import type { DoltClient } from "./client";

export interface DoltChangeEvent {
	database: string;
	previousHash: string | null;
	currentHash: string;
	changedTables: string[] | null;
	ts: number;
}

export interface DoltWatcherOptions {
	intervalMs?: number;
	idleIntervalMs?: number;
	jitterMs?: number;
	narrowTables?: readonly string[];
	activeDatabases?: readonly string[] | (() => readonly string[]);
}

type Listener = (event: DoltChangeEvent) => void;

const DEFAULT_NARROW_TABLES = ["issues", "wisps", "agents", "convoys"] as const;

export class DoltWatcher {
	private readonly client: DoltClient;
	private readonly intervalMs: number;
	private readonly idleIntervalMs: number;
	private readonly jitterMs: number;
	private readonly narrowTables: readonly string[];
	private readonly activeDatabases?: () => readonly string[];
	private readonly listeners = new Set<Listener>();
	private readonly dbHashes = new Map<string, string>();
	private readonly tableHashes = new Map<string, string | null>();
	private timer: NodeJS.Timeout | null = null;
	private inFlight: Promise<void> | null = null;
	private stopping = false;
	private running = false;

	constructor(client: DoltClient, options: DoltWatcherOptions = {}) {
		this.client = client;
		this.intervalMs = options.intervalMs ?? 1000;
		this.idleIntervalMs =
			options.idleIntervalMs ??
			(options.intervalMs === undefined ? 5000 : this.intervalMs);
		this.jitterMs = options.jitterMs ?? 100;
		this.narrowTables = options.narrowTables ?? DEFAULT_NARROW_TABLES;
		if (typeof options.activeDatabases === "function") {
			this.activeDatabases = options.activeDatabases;
		} else if (options.activeDatabases) {
			const activeDatabases = options.activeDatabases;
			this.activeDatabases = () => activeDatabases;
		}
	}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.stopping = false;
		this.scheduleNext(0);
	}

	async stop(): Promise<void> {
		this.stopping = true;
		this.running = false;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		const inFlight = this.inFlight;
		if (inFlight) await inFlight.catch(() => {});
	}

	on(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private scheduleNext(delay: number): void {
		if (this.stopping) return;
		this.timer = setTimeout(() => {
			this.timer = null;
			if (this.stopping) return;
			const tick = this.tick().then((changed) => {
				this.inFlight = null;
				this.scheduleNext(this.nextDelay(changed));
			});
			this.inFlight = tick;
		}, delay);
	}

	private nextDelay(changed: boolean): number {
		const interval = changed ? this.intervalMs : this.idleIntervalMs;
		const jitter = (Math.random() * 2 - 1) * this.jitterMs;
		return Math.max(0, interval + jitter);
	}

	private async tick(): Promise<boolean> {
		try {
			await this.client.connect();
			const databases = await this.databasesToPoll();
			if (databases.length === 0) return false;
			const hashes = await this.client.hashOfDatabases(databases);
			let changed = false;
			for (const { database, hash } of hashes) {
				if (this.stopping) return changed;
				if (hash === null) continue;
				const prev = this.dbHashes.get(database);
				this.dbHashes.set(database, hash);
				if (prev === undefined || prev === hash) continue;
				const changedTables = await this.narrow(database);
				changed = true;
				this.emit({
					database,
					previousHash: prev,
					currentHash: hash,
					changedTables,
					ts: Date.now(),
				});
			}
			return changed;
		} catch (err) {
			console.error("[dolt-watcher] tick failed:", err);
			return false;
		}
	}

	private async databasesToPoll(): Promise<string[]> {
		const activeDatabases = this.activeDatabases?.();
		if (activeDatabases) {
			return [...new Set(activeDatabases.map((db) => db.trim()).filter(Boolean))];
		}
		return this.client.listDatabases();
	}

	private async narrow(database: string): Promise<string[] | null> {
		try {
			const changed: string[] = [];
			for (const table of this.narrowTables) {
				const next = await this.client.hashOfTable(database, table);
				const key = `${database}\u0000${table}`;
				const prev = this.tableHashes.get(key);
				const seen = this.tableHashes.has(key);
				this.tableHashes.set(key, next);
				if (seen && prev !== next) changed.push(table);
			}
			return changed;
		} catch {
			return null;
		}
	}

	private emit(event: DoltChangeEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (err) {
				console.error("[dolt-watcher] listener error:", err);
			}
		}
	}
}
