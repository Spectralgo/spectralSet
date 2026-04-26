import {
	type ListInboxArgs,
	listInbox,
	type MailMessage,
} from "@spectralset/gastown-cli-client";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { resolveTownPath } from "./resolve-town-path";

const DEFAULT_STALE_MS = 10_000;

type ListInboxOptions = NonNullable<Parameters<typeof listInbox>[1]>;
type ShellOptionsFn = () => Promise<ListInboxOptions>;

export interface MailInboxCacheDeps {
	listInboxFn?: typeof listInbox;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
	shellOptionsFn?: ShellOptionsFn;
	staleMs?: number;
	now?: () => number;
}

export interface MailInboxCacheInput {
	address?: string;
	unreadOnly?: boolean;
	townPath?: string;
}

export interface MailInboxCache {
	list(input?: MailInboxCacheInput): Promise<MailMessage[]>;
	clear(): void;
}

interface CacheEntry {
	data?: MailMessage[];
	updatedAt: number;
	refreshPromise?: Promise<MailMessage[]>;
}

async function defaultShellOptions(): Promise<ListInboxOptions> {
	return { env: await getProcessEnvWithShellPath() };
}

function cacheKey(args: ListInboxArgs): string {
	return JSON.stringify({
		address: args.address ?? null,
		unreadOnly: args.unreadOnly ?? false,
		townRoot: args.townRoot ?? null,
	});
}

export function createMailInboxCache(
	deps: MailInboxCacheDeps = {},
): MailInboxCache {
	const listInboxImpl = deps.listInboxFn ?? listInbox;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;
	const shellOptionsImpl = deps.shellOptionsFn ?? defaultShellOptions;
	const staleMs = deps.staleMs ?? DEFAULT_STALE_MS;
	const now = deps.now ?? (() => Date.now());
	const entries = new Map<string, CacheEntry>();

	const refresh = (key: string, args: ListInboxArgs, entry: CacheEntry) => {
		if (entry.refreshPromise) return entry.refreshPromise;

		entry.refreshPromise = (async () => {
			const data = await listInboxImpl(args, await shellOptionsImpl());
			entry.data = data;
			entry.updatedAt = now();
			return data;
		})().finally(() => {
			const current = entries.get(key);
			if (current === entry) {
				current.refreshPromise = undefined;
			}
		});

		return entry.refreshPromise;
	};

	return {
		async list(input: MailInboxCacheInput = {}): Promise<MailMessage[]> {
			const args: ListInboxArgs = {
				address: input.address,
				unreadOnly: input.unreadOnly,
				townRoot: resolveTownPathImpl(input.townPath),
			};
			const key = cacheKey(args);
			let entry = entries.get(key);
			if (!entry) {
				entry = { updatedAt: 0 };
				entries.set(key, entry);
			}

			if (!entry.data) {
				return refresh(key, args, entry);
			}

			if (now() - entry.updatedAt >= staleMs) {
				void refresh(key, args, entry).catch(() => {
					// Keep serving the last successful inbox; a later request can retry.
				});
			}

			return entry.data;
		},
		clear(): void {
			entries.clear();
		},
	};
}

export const defaultMailInboxCache = createMailInboxCache();
