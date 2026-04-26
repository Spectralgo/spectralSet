import type {
	AgentSummary,
	GastownCliClientOptions,
	ListAgentsArgs,
	ProbeResult,
	ReadStatusSnapshotArgs,
	StatusSnapshot,
} from "@spectralset/gastown-cli-client";
import { listAgents, probe } from "@spectralset/gastown-cli-client";

const DEFAULT_STALE_MS = 5_000;

export interface GastownStatusCacheDeps {
	probeFn?: typeof probe;
	listAgentsFn?: typeof listAgents;
	readStatusSnapshotFn?: (
		args?: ReadStatusSnapshotArgs,
		options?: GastownCliClientOptions,
	) => Promise<StatusSnapshot>;
	staleMs?: number;
	now?: () => number;
}

interface CacheEntry<T> {
	data?: T;
	updatedAt: number;
	refreshPromise?: Promise<T>;
}

type Loader<T> = () => Promise<T>;

function execEnvKey(options: GastownCliClientOptions): string | null {
	const env = options.env;
	if (!env) return null;
	return JSON.stringify({
		HOME: env.HOME ?? null,
		PATH: env.PATH ?? null,
	});
}

function envKey(options: GastownCliClientOptions): string | null {
	const env = options.env;
	if (!env) return null;
	return JSON.stringify({
		GT_TOWN_ROOT: env.GT_TOWN_ROOT ?? null,
		HOME: env.HOME ?? null,
		PATH: env.PATH ?? null,
	});
}

function probeKey(options: GastownCliClientOptions): string {
	return JSON.stringify({
		cwd: options.cwd ?? null,
		env: envKey(options),
	});
}

function listAgentsKey(
	args: ListAgentsArgs,
	options: GastownCliClientOptions,
): string {
	return JSON.stringify({
		townRoot: args.townRoot ?? null,
		cwd: options.cwd ?? null,
		env: envKey(options),
	});
}

function snapshotTownRoot(
	townRoot: string | undefined,
	options: GastownCliClientOptions,
): string | undefined {
	return townRoot ?? options.cwd ?? options.env?.GT_TOWN_ROOT ?? undefined;
}

function snapshotKey(
	townRoot: string | undefined,
	options: GastownCliClientOptions,
): string {
	return JSON.stringify({
		townRoot: snapshotTownRoot(townRoot, options) ?? null,
		env: execEnvKey(options),
	});
}

function createSwrStore<T>(staleMs: number, now: () => number) {
	const entries = new Map<string, CacheEntry<T>>();

	const refresh = (key: string, entry: CacheEntry<T>, load: Loader<T>) => {
		if (entry.refreshPromise) return entry.refreshPromise;

		entry.refreshPromise = load()
			.then((data) => {
				entry.data = data;
				entry.updatedAt = now();
				return data;
			})
			.finally(() => {
				const current = entries.get(key);
				if (current === entry) {
					current.refreshPromise = undefined;
				}
			});

		return entry.refreshPromise;
	};

	return {
		get(key: string, load: Loader<T>): Promise<T> | T {
			let entry = entries.get(key);
			if (!entry) {
				entry = { updatedAt: 0 };
				entries.set(key, entry);
			}

			if (!entry.data) {
				return refresh(key, entry, load);
			}

			if (now() - entry.updatedAt >= staleMs) {
				void refresh(key, entry, load).catch(() => {
					// Keep serving the last successful status snapshot.
				});
			}

			return entry.data;
		},
		clear(): void {
			entries.clear();
		},
	};
}

export function createGastownStatusCache(deps: GastownStatusCacheDeps = {}) {
	const probeImpl = deps.probeFn ?? probe;
	const listAgentsImpl = deps.listAgentsFn ?? listAgents;
	const readStatusSnapshotImpl = deps.readStatusSnapshotFn;
	const staleMs = deps.staleMs ?? DEFAULT_STALE_MS;
	const now = deps.now ?? (() => Date.now());
	const probeStore = createSwrStore<ProbeResult>(staleMs, now);
	const agentsStore = createSwrStore<AgentSummary[]>(staleMs, now);
	const snapshotStore = createSwrStore<StatusSnapshot>(staleMs, now);

	function getSnapshot(
		townRoot: string | undefined,
		options: GastownCliClientOptions,
	): Promise<StatusSnapshot> | StatusSnapshot {
		if (!readStatusSnapshotImpl) {
			throw new Error("readStatusSnapshotFn is not configured");
		}
		const normalizedTownRoot = snapshotTownRoot(townRoot, options);
		return snapshotStore.get(snapshotKey(townRoot, options), () =>
			readStatusSnapshotImpl({ townRoot: normalizedTownRoot }, options),
		);
	}

	return {
		probe(options: GastownCliClientOptions = {}): Promise<ProbeResult> {
			if (readStatusSnapshotImpl) {
				return Promise.resolve(getSnapshot(undefined, options)).then(
					(snapshot) => snapshot.probe,
				);
			}
			return Promise.resolve(
				probeStore.get(probeKey(options), () => probeImpl(options)),
			);
		},
		listAgents(
			args: ListAgentsArgs = {},
			options: GastownCliClientOptions = {},
		): Promise<AgentSummary[]> {
			if (readStatusSnapshotImpl) {
				return Promise.resolve(getSnapshot(args.townRoot, options)).then(
					(snapshot) => snapshot.agents,
				);
			}
			return Promise.resolve(
				agentsStore.get(listAgentsKey(args, options), () =>
					listAgentsImpl(args, options),
				),
			);
		},
		clear(): void {
			probeStore.clear();
			agentsStore.clear();
			snapshotStore.clear();
		},
	};
}
