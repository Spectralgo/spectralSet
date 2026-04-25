import { readdir, stat } from "node:fs/promises";
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
