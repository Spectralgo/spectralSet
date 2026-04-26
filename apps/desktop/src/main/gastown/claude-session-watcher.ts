import { EventEmitter } from "node:events";
import { type FSWatcher, watch as fsWatch } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type ClaudePolecatLiveness =
	| "working"
	| "idle"
	| "budget-locked"
	| "missing";

export type ClaudeSessionRecord =
	| { type: "assistant"; ts: number; content?: unknown }
	| { type: "user"; ts: number; content?: unknown }
	| { type: "result"; ts: number; subtype?: string };

export interface ClaudeSessionFile {
	path: string;
	sessionUuid: string;
	projectHash: string;
}

export async function findClaudeSessionFile(args: {
	cloneDir: string;
	claudeProjectsDir?: string;
}): Promise<ClaudeSessionFile | null> {
	const projectsDir =
		args.claudeProjectsDir ?? join(homedir(), ".claude", "projects");
	const projectHash = encodeProjectHash(args.cloneDir);
	const dir = join(projectsDir, projectHash);
	try {
		const entries = await readdir(dir);
		const sessions = entries.filter((f) => f.endsWith(".jsonl"));
		if (sessions.length === 0) return null;
		const withMtime = await Promise.all(
			sessions.map(async (f) => ({
				f,
				mtime: (await stat(join(dir, f))).mtimeMs,
			})),
		);
		withMtime.sort((a, b) => b.mtime - a.mtime);
		const newest = withMtime[0].f;
		return {
			path: join(dir, newest),
			sessionUuid: newest.replace(".jsonl", ""),
			projectHash,
		};
	} catch {
		return null;
	}
}

function encodeProjectHash(cloneDir: string): string {
	return cloneDir.replace(/\//g, "-");
}

export interface ClaudePolecatAgent {
	rig: string;
	name: string;
	cloneDir: string;
}

export interface ClaudeStateChange {
	agent: ClaudePolecatAgent;
	state: ClaudePolecatLiveness;
	lastEventAt?: number;
}

const BUDGET_MARKER = /Stop and wait for limit to reset/;

export class ClaudeSessionWatcher extends EventEmitter {
	private watchers = new Map<string, FSWatcher>();
	private timers = new Map<string, NodeJS.Timeout>();
	constructor(
		private opts: {
			claudeProjectsDir?: string;
			debounceMs?: number;
			tail?: number;
		} = {},
	) {
		super();
	}

	async watch(agent: ClaudePolecatAgent): Promise<void> {
		const file = await findClaudeSessionFile({
			cloneDir: agent.cloneDir,
			claudeProjectsDir: this.opts.claudeProjectsDir,
		});
		const key = `${agent.rig}/${agent.name}`;
		if (!file) {
			this.emit("change", { agent, state: "missing" } as ClaudeStateChange);
			return;
		}
		const debounce = this.opts.debounceMs ?? 200;
		this.watchers.set(
			key,
			fsWatch(file.path, () => {
				const prev = this.timers.get(key);
				if (prev) clearTimeout(prev);
				this.timers.set(
					key,
					setTimeout(() => this.deriveState(agent, file.path), debounce),
				);
			}),
		);
		await this.deriveState(agent, file.path);
	}

	unwatch(agent: ClaudePolecatAgent): void {
		const key = `${agent.rig}/${agent.name}`;
		this.watchers.get(key)?.close();
		this.watchers.delete(key);
		const t = this.timers.get(key);
		if (t) clearTimeout(t);
		this.timers.delete(key);
	}

	private async deriveState(a: ClaudePolecatAgent, p: string): Promise<void> {
		const records = await parseLastN(p, this.opts.tail ?? 20);
		this.emit("change", {
			agent: a,
			state: classify(records),
			lastEventAt: records.at(-1)?.ts,
		} as ClaudeStateChange);
	}
}

export async function parseLastN(
	path: string,
	n: number,
): Promise<ClaudeSessionRecord[]> {
	let body: string;
	try {
		body = await readFile(path, "utf8");
	} catch {
		return [];
	}
	return body
		.split("\n")
		.filter((l) => l.length > 0)
		.slice(-n)
		.flatMap((l) => {
			try {
				return [JSON.parse(l) as ClaudeSessionRecord];
			} catch {
				return [];
			}
		});
}

export function classify(
	records: ClaudeSessionRecord[],
): ClaudePolecatLiveness {
	if (records.some((r) => BUDGET_MARKER.test(JSON.stringify(r))))
		return "budget-locked";
	const last = records.at(-1);
	if (!last) return "idle";
	if (last.type === "user") return "working";
	if (last.type === "assistant") {
		const lastA = records.findLastIndex((r) => r.type === "assistant");
		const lastR = records.findLastIndex((r) => r.type === "result");
		return lastA > lastR ? "working" : "idle";
	}
	return "idle";
}
