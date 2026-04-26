import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { appendFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type ClaudeSessionRecord,
	ClaudeSessionWatcher,
	type ClaudeStateChange,
	classify,
	findClaudeSessionFile,
	parseLastN,
} from "./claude-session-watcher";

describe("findClaudeSessionFile", () => {
	let claudeProjectsDir: string;

	beforeEach(async () => {
		claudeProjectsDir = await mkdtemp(join(tmpdir(), "claude-projects-"));
	});

	afterEach(async () => {
		await rm(claudeProjectsDir, { recursive: true, force: true });
	});

	it("returns the most-recently-modified session for a project", async () => {
		const cloneDir = "/Users/test/repo";
		const projectHash = "-Users-test-repo";
		const dir = join(claudeProjectsDir, projectHash);
		await mkdir(dir, { recursive: true });
		const oldPath = join(dir, "old-uuid.jsonl");
		const newPath = join(dir, "new-uuid.jsonl");
		await writeFile(oldPath, "");
		await new Promise((r) => setTimeout(r, 20));
		await writeFile(newPath, "");

		const result = await findClaudeSessionFile({ cloneDir, claudeProjectsDir });

		expect(result).not.toBeNull();
		expect(result?.path).toBe(newPath);
		expect(result?.sessionUuid).toBe("new-uuid");
		expect(result?.projectHash).toBe(projectHash);
	});

	it("returns null when the project hash directory does not exist", async () => {
		const result = await findClaudeSessionFile({
			cloneDir: "/Users/missing/path",
			claudeProjectsDir,
		});
		expect(result).toBeNull();
	});

	it("returns null when the project directory is empty", async () => {
		const cloneDir = "/Users/empty/repo";
		const projectHash = "-Users-empty-repo";
		await mkdir(join(claudeProjectsDir, projectHash), { recursive: true });

		const result = await findClaudeSessionFile({ cloneDir, claudeProjectsDir });
		expect(result).toBeNull();
	});

	it("ignores non-jsonl files in the project directory", async () => {
		const cloneDir = "/Users/mixed/repo";
		const projectHash = "-Users-mixed-repo";
		const dir = join(claudeProjectsDir, projectHash);
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, "notes.txt"), "ignore me");

		const result = await findClaudeSessionFile({ cloneDir, claudeProjectsDir });
		expect(result).toBeNull();
	});
});

const rec = (
	type: ClaudeSessionRecord["type"],
	ts: number,
	extra: object = {},
): ClaudeSessionRecord =>
	({ type, ts, ...extra }) as unknown as ClaudeSessionRecord;

describe("classify", () => {
	it("returns 'working' when last record is assistant with no following result", () => {
		expect(classify([rec("user", 1), rec("assistant", 2)])).toBe("working");
	});

	it("returns 'idle' when a result follows the last assistant", () => {
		expect(
			classify([rec("user", 1), rec("assistant", 2), rec("result", 3)]),
		).toBe("idle");
	});

	it("returns 'working' when last record is user", () => {
		expect(
			classify([rec("assistant", 1), rec("result", 2), rec("user", 3)]),
		).toBe("working");
	});

	it("returns 'budget-locked' when records contain the budget-modal marker", () => {
		const budget = rec("assistant", 1, {
			content: "Stop and wait for limit to reset to 9am",
		});
		expect(classify([rec("user", 0), budget])).toBe("budget-locked");
	});

	it("returns 'idle' on empty records", () => {
		expect(classify([])).toBe("idle");
	});
});

describe("parseLastN", () => {
	let dir: string;
	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "claude-watcher-"));
	});
	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("parses only the last N JSONL records and skips malformed lines", async () => {
		const path = join(dir, "session.jsonl");
		const lines = [
			JSON.stringify({ type: "user", ts: 1 }),
			"not json",
			JSON.stringify({ type: "assistant", ts: 2 }),
			JSON.stringify({ type: "result", ts: 3 }),
			JSON.stringify({ type: "user", ts: 4 }),
		].join("\n");
		await writeFile(path, `${lines}\n`);

		const all = await parseLastN(path, 10);
		expect(all.map((r) => r.ts)).toEqual([1, 2, 3, 4]);

		const tail = await parseLastN(path, 2);
		expect(tail.map((r) => r.ts)).toEqual([3, 4]);
	});

	it("returns [] when the file is missing", async () => {
		expect(await parseLastN(join(dir, "missing.jsonl"), 5)).toEqual([]);
	});
});

describe("ClaudeSessionWatcher", () => {
	let claudeProjectsDir: string;
	let projectsDir: string;
	const cloneDir = "/Users/test/repo";
	const projectHash = "-Users-test-repo";
	const agent = { rig: "spectralSet", name: "granite", cloneDir };

	beforeEach(async () => {
		claudeProjectsDir = await mkdtemp(join(tmpdir(), "claude-watcher-"));
		projectsDir = join(claudeProjectsDir, projectHash);
		await mkdir(projectsDir, { recursive: true });
	});
	afterEach(async () => {
		await rm(claudeProjectsDir, { recursive: true, force: true });
	});

	it("emits 'missing' when no session file exists for the agent", async () => {
		const watcher = new ClaudeSessionWatcher({ claudeProjectsDir });
		const events: ClaudeStateChange[] = [];
		watcher.on("change", (e: ClaudeStateChange) => events.push(e));
		await watcher.watch({
			rig: "spectralSet",
			name: "granite",
			cloneDir: "/Users/missing/repo",
		});
		expect(events).toHaveLength(1);
		expect(events[0].state).toBe("missing");
	});

	it("emits an initial state derived from the existing session file", async () => {
		const path = join(projectsDir, "session-1.jsonl");
		await writeFile(
			path,
			`${[
				JSON.stringify({ type: "user", ts: 1 }),
				JSON.stringify({ type: "assistant", ts: 2 }),
			].join("\n")}\n`,
		);

		const watcher = new ClaudeSessionWatcher({ claudeProjectsDir });
		const events: ClaudeStateChange[] = [];
		watcher.on("change", (e: ClaudeStateChange) => events.push(e));
		await watcher.watch(agent);
		watcher.unwatch(agent);

		expect(events).toHaveLength(1);
		expect(events[0].state).toBe("working");
		expect(events[0].lastEventAt).toBe(2);
	});

	it("debounces rapid file changes with a 200ms window", async () => {
		const path = join(projectsDir, "session-1.jsonl");
		await writeFile(path, `${JSON.stringify({ type: "user", ts: 1 })}\n`);

		const watcher = new ClaudeSessionWatcher({
			claudeProjectsDir,
			debounceMs: 200,
		});
		const events: ClaudeStateChange[] = [];
		watcher.on("change", (e: ClaudeStateChange) => events.push(e));

		await watcher.watch(agent);
		expect(events).toHaveLength(1);

		await appendFile(path, `${JSON.stringify({ type: "assistant", ts: 2 })}\n`);
		await new Promise((r) => setTimeout(r, 50));
		await appendFile(path, `${JSON.stringify({ type: "result", ts: 3 })}\n`);
		await new Promise((r) => setTimeout(r, 50));
		expect(events).toHaveLength(1); // still debounced

		await new Promise((r) => setTimeout(r, 250));
		watcher.unwatch(agent);

		expect(events.length).toBeGreaterThanOrEqual(2);
		const last = events[events.length - 1];
		expect(last.state).toBe("idle");
		expect(last.lastEventAt).toBe(3);
	});
});
