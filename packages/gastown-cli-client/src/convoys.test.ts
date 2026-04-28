import { describe, expect, it } from "bun:test";
import type { SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	convoyStatus,
	createConvoy,
	deriveBeadStatus,
	listConvoys,
} from "./convoys";
import { GastownCliError } from "./exec";

interface SpawnCall {
	bin: string;
	argv: readonly string[];
	options: SpawnOptions;
	stdin: string;
}

interface FakeSpawnScript {
	stdout?: string;
	stderr?: string;
	exitCode?: number;
}

function makeRecordingSpawn(script: FakeSpawnScript | FakeSpawnScript[]) {
	const calls: SpawnCall[] = [];
	const scripts = Array.isArray(script) ? script : [script];

	const spawnFn = ((
		bin: string,
		argv: readonly string[],
		options: SpawnOptions,
	) => {
		let stdin = "";
		const child = new EventEmitter() as EventEmitter & {
			stdout: EventEmitter;
			stderr: EventEmitter;
			stdin: {
				on: (event: string, handler: () => void) => void;
				end: (data?: string) => void;
			};
			kill: () => void;
		};
		child.stdout = new EventEmitter();
		child.stderr = new EventEmitter();
		child.stdin = {
			on: () => {},
			end: (data?: string) => {
				stdin = data ?? "";
			},
		};
		child.kill = () => {};

		calls.push({
			bin,
			argv: [...argv],
			options,
			get stdin() {
				return stdin;
			},
		} as SpawnCall);

		const entry = scripts[calls.length - 1] ?? scripts[scripts.length - 1];

		queueMicrotask(() => {
			if (entry?.stdout) child.stdout.emit("data", Buffer.from(entry.stdout));
			if (entry?.stderr) child.stderr.emit("data", Buffer.from(entry.stderr));
		});

		setTimeout(() => {
			child.emit("close", entry?.exitCode ?? 0);
		}, 1);

		return child;
	}) as unknown as typeof import("node:child_process").spawn;

	return { spawnFn, calls };
}

const CONVOY_LIST_JSON = JSON.stringify([
	{
		id: "hq-cv-v2zu2",
		title: "Work: CB-A",
		status: "open",
		created_at: "2026-04-19T20:25:18Z",
		tracked: [
			{
				id: "ss-rhx",
				title: "",
				status: "",
				dependency_type: "tracks",
				issue_type: "",
			},
		],
		completed: 0,
		total: 1,
	},
	{
		id: "hq-cv-tg7lo",
		title: "Work: P5-B",
		status: "closed",
		created_at: "2026-04-19T20:24:01Z",
		tracked: [],
		completed: 2,
		total: 2,
	},
]);

const DOLT_CONVOY_ROWS_JSON = JSON.stringify({
	rows: [
		{
			id: "hq-cv-fast",
			title: "Work: Fast path",
			status: "open",
			created_at: "2026-04-26 00:12:02",
			tracked_id: "ss-fast",
			tracked_title: "Fast bead",
			tracked_status: "closed",
			tracked_issue_type: "task",
			dependency_type: "tracks",
		},
		{
			id: "hq-cv-empty",
			title: "Work: Empty convoy",
			status: "open",
			created_at: "2026-04-25 23:00:00",
			tracked_id: null,
			tracked_title: null,
			tracked_status: null,
			tracked_issue_type: null,
			dependency_type: null,
		},
	],
});

function withTownRoot<T>(fn: (townRoot: string) => Promise<T>): Promise<T> {
	const townRoot = mkdtempSync(join(tmpdir(), "gastown-town-"));
	mkdirSync(join(townRoot, ".dolt-data", "hq"), { recursive: true });
	return fn(townRoot).finally(() => {
		rmSync(townRoot, { recursive: true, force: true });
	});
}

// Anchors the test process cwd in a directory outside any Gas Town root and
// scrubs GT_TOWN_ROOT so the auto-discover walk-up backstop can't resolve one.
function withNonTownCwd<T>(fn: () => Promise<T>): Promise<T> {
	const original = process.cwd();
	const originalEnv = process.env.GT_TOWN_ROOT;
	const tmp = mkdtempSync(join(tmpdir(), "gastown-non-town-"));
	delete process.env.GT_TOWN_ROOT;
	process.chdir(tmp);
	return fn().finally(() => {
		process.chdir(original);
		if (originalEnv !== undefined) process.env.GT_TOWN_ROOT = originalEnv;
		rmSync(tmp, { recursive: true, force: true });
	});
}

describe("listConvoys()", () => {
	it("uses the hq Dolt tables when a townRoot is available", async () => {
		await withTownRoot(async (townRoot) => {
			const { spawnFn, calls } = makeRecordingSpawn({
				stdout: DOLT_CONVOY_ROWS_JSON,
				exitCode: 0,
			});
			const result = await listConvoys({ townRoot }, {}, { spawn: spawnFn });
			expect(calls[0]?.bin).toBe("dolt");
			expect(calls[0]?.argv.slice(0, 4)).toEqual(["sql", "-r", "json", "-q"]);
			expect(calls[0]?.options.cwd).toBe(join(townRoot, ".dolt-data", "hq"));
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				id: "hq-cv-fast",
				completed: 1,
				total: 1,
			});
			expect(result[0]?.tracked[0]).toMatchObject({
				id: "ss-fast",
				title: "Fast bead",
				status: "closed",
				issue_type: "task",
			});
		});
	});

	it("falls back to `gt convoy list --json` when the Dolt fast path fails", async () => {
		await withTownRoot(async (townRoot) => {
			const { spawnFn, calls } = makeRecordingSpawn([
				{ stderr: "schema mismatch", exitCode: 1 },
				{ stdout: CONVOY_LIST_JSON, exitCode: 0 },
			]);
			const result = await listConvoys({ townRoot }, {}, { spawn: spawnFn });
			expect(calls[0]?.bin).toBe("dolt");
			expect(calls[1]?.bin).toBe("gt");
			expect(calls[1]?.argv).toEqual(["convoy", "list", "--json"]);
			expect(result[0]?.id).toBe("hq-cv-v2zu2");
		});
	});

	it("invokes `gt convoy list --json` and parses the array", async () => {
		await withNonTownCwd(async () => {
			const { spawnFn, calls } = makeRecordingSpawn({
				stdout: CONVOY_LIST_JSON,
				exitCode: 0,
			});
			const result = await listConvoys({}, {}, { spawn: spawnFn });
			expect(calls[0]?.bin).toBe("gt");
			expect(calls[0]?.argv).toEqual(["convoy", "list", "--json"]);
			expect(result).toHaveLength(2);
			expect(result[0]?.id).toBe("hq-cv-v2zu2");
			expect(result[0]?.tracked[0]?.dependency_type).toBe("tracks");
		});
	});

	it("appends --all when args.all is true", async () => {
		await withNonTownCwd(async () => {
			const { spawnFn, calls } = makeRecordingSpawn({
				stdout: "[]",
				exitCode: 0,
			});
			await listConvoys({ all: true }, {}, { spawn: spawnFn });
			expect(calls[0]?.argv).toEqual(["convoy", "list", "--json", "--all"]);
		});
	});

	it("appends --status=<value> when args.status is set", async () => {
		await withNonTownCwd(async () => {
			const { spawnFn, calls } = makeRecordingSpawn({
				stdout: "[]",
				exitCode: 0,
			});
			await listConvoys({ status: "closed" }, {}, { spawn: spawnFn });
			expect(calls[0]?.argv).toEqual([
				"convoy",
				"list",
				"--json",
				"--status=closed",
			]);
		});
	});

	it("walks up from process.cwd() to find the Gas Town root when none is provided", async () => {
		await withTownRoot(async (townRoot) => {
			const nestedCwd = join(townRoot, "rig", "polecats", "alice");
			mkdirSync(nestedCwd, { recursive: true });
			const original = process.cwd();
			const originalEnv = process.env.GT_TOWN_ROOT;
			delete process.env.GT_TOWN_ROOT;
			process.chdir(nestedCwd);
			try {
				const { spawnFn, calls } = makeRecordingSpawn({
					stdout: DOLT_CONVOY_ROWS_JSON,
					exitCode: 0,
				});
				const result = await listConvoys({}, {}, { spawn: spawnFn });
				expect(calls[0]?.bin).toBe("dolt");
				// macOS prepends /private to /var symlinks once cwd is resolved.
				expect(calls[0]?.options.cwd).toContain(".dolt-data/hq");
				expect(result).toHaveLength(2);
			} finally {
				process.chdir(original);
				if (originalEnv !== undefined) process.env.GT_TOWN_ROOT = originalEnv;
			}
		});
	});

	it("throws GastownCliError on non-zero exit", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stderr: "boom",
			exitCode: 1,
		});
		await expect(
			listConvoys({}, {}, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliError);
	});
});

const CONVOY_STATUS_JSON = JSON.stringify({
	id: "hq-cv-v2zu2",
	title: "Work: CB-A",
	status: "open",
	created_at: "2026-04-19T20:25:18Z",
	tracked: [],
	completed: 0,
	total: 0,
});

describe("convoyStatus()", () => {
	it("invokes `gt convoy status <id> --json` and parses the object", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: CONVOY_STATUS_JSON,
			exitCode: 0,
		});
		const result = await convoyStatus(
			{ id: "hq-cv-v2zu2" },
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.argv).toEqual([
			"convoy",
			"status",
			"hq-cv-v2zu2",
			"--json",
		]);
		expect(result.id).toBe("hq-cv-v2zu2");
	});

	it("throws GastownCliError on non-zero exit", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stderr: "not found",
			exitCode: 1,
		});
		await expect(
			convoyStatus({ id: "hq-missing" }, {}, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliError);
	});
});

const CREATE_CONVOY_STDOUT =
	"✓ Created convoy 🚚 hq-cv-abc123\n\n  Name:     Wave R-3\n  Tracking: 1 issues\n  Issues:   ss-tjfp\n  Merge:    direct\n  Owned:    caller-managed lifecycle\n";

describe("createConvoy()", () => {
	it("invokes `gt convoy create <name> <issues...> --owned --merge=<strategy>` and parses the new id", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: CREATE_CONVOY_STDOUT,
			exitCode: 0,
		});
		const result = await createConvoy(
			{
				name: "Wave R-3",
				issueIds: ["ss-tjfp"],
				owned: true,
				mergeStrategy: "direct",
			},
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.bin).toBe("gt");
		expect(calls[0]?.argv).toEqual([
			"convoy",
			"create",
			"Wave R-3",
			"ss-tjfp",
			"--owned",
			"--merge=direct",
		]);
		expect(result).toEqual({ id: "hq-cv-abc123", title: "Wave R-3" });
	});

	it("omits --owned and --merge when not provided", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: CREATE_CONVOY_STDOUT,
			exitCode: 0,
		});
		await createConvoy(
			{ name: "Wave R-3", issueIds: ["ss-a", "ss-b"] },
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.argv).toEqual([
			"convoy",
			"create",
			"Wave R-3",
			"ss-a",
			"ss-b",
		]);
	});

	it("rejects when issueIds is empty (gt requires ≥1)", async () => {
		const { spawnFn } = makeRecordingSpawn({ stdout: "", exitCode: 0 });
		await expect(
			createConvoy({ name: "Empty", issueIds: [] }, {}, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliError);
	});

	it("throws GastownCliError on non-zero exit", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stderr: "boom",
			exitCode: 1,
		});
		await expect(
			createConvoy({ name: "X", issueIds: ["ss-a"] }, {}, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliError);
	});

	it("throws GastownCliError when stdout has no convoy id", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stdout: "no convoy id here",
			exitCode: 0,
		});
		await expect(
			createConvoy({ name: "X", issueIds: ["ss-a"] }, {}, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliError);
	});
});

describe("deriveBeadStatus()", () => {
	it("preserves hooked, blocked, and closed verbatim", () => {
		expect(deriveBeadStatus("hooked")).toBe("hooked");
		expect(deriveBeadStatus("blocked")).toBe("blocked");
		expect(deriveBeadStatus("closed")).toBe("closed");
	});

	it("collapses other bd statuses (in_progress/deferred/pinned/open) to open", () => {
		expect(deriveBeadStatus("open")).toBe("open");
		expect(deriveBeadStatus("in_progress")).toBe("open");
		expect(deriveBeadStatus("deferred")).toBe("open");
		expect(deriveBeadStatus("pinned")).toBe("open");
		expect(deriveBeadStatus("unknown")).toBe("open");
	});
});
