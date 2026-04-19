import { describe, expect, it } from "bun:test";
import type { SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import {
	checkRecovery,
	listPolecats,
	listRigs,
	listWorktrees,
	nuke,
	peek,
	probe,
	sling,
} from "./index";

interface SpawnCall {
	bin: string;
	argv: readonly string[];
	options: SpawnOptions;
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
		calls.push({ bin, argv: [...argv], options });
		const child = new EventEmitter() as EventEmitter & {
			stdout: EventEmitter;
			stderr: EventEmitter;
			kill: () => void;
		};
		child.stdout = new EventEmitter();
		child.stderr = new EventEmitter();
		child.kill = () => {};

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

const STATUS_JSON = JSON.stringify({
	name: "demo",
	location: "/Users/demo/town",
	daemon: { running: true },
	dolt: { running: true },
	rigs: [
		{
			name: "alpha",
			polecat_count: 2,
			crew_count: 1,
			has_witness: true,
			has_refinery: true,
		},
	],
});

const EMPTY_RIG_LIST = `Rigs in /Users/demo/town:\n\n(no rigs configured)\n`;

const PEEK_OUTPUT = "agent output\n";
const POLECAT_LIST_EMPTY = "(no polecats)\n";
const SLING_OUTPUT = `Slinging a-1 → alpha
Polecat quartz spawned
Formula wisp created: ss-wisp-1
Attached to quartz's hook.
`;
const RECOVERY_JSON = JSON.stringify({
	rig: "alpha",
	polecat: "quartz",
	cleanup_status: "clean",
	needs_recovery: false,
	verdict: "SAFE_TO_NUKE",
});
const NUKE_SUCCESS = `Nuking alpha/quartz...
  ○ worktree already gone
  ○ Closed agent bead: ss-alpha-polecat-quartz
Purged closed ephemeral beads: ✓ Purged 1 closed ephemeral bead(s)

✓ Nuked 1 polecat(s).
`;

describe("probe() — gt status --json primary path", () => {
	it("parses town metadata, rigs, and daemon/dolt state", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: STATUS_JSON,
			exitCode: 0,
		});
		const result = await probe({}, { spawn: spawnFn });
		expect(result).toEqual({
			installed: true,
			version: null,
			townRoot: "/Users/demo/town",
			townName: "demo",
			rigs: [
				{
					name: "alpha",
					witnessRunning: true,
					refineryRunning: true,
					polecatCount: 2,
					crewCount: 1,
					agents: [],
				},
			],
			daemonRunning: true,
			doltRunning: true,
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.argv).toEqual(["status", "--json"]);
	});

	it("falls back to --version when gt status exits non-zero", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: "", stderr: "not in a Gas Town workspace\n", exitCode: 1 },
			{ stdout: "gt version 1.2.3\n", exitCode: 0 },
		]);
		const result = await probe({}, { spawn: spawnFn });
		expect(result.installed).toBe(true);
		expect(result.version).toBe("1.2.3");
		expect(result.townRoot).toBeNull();
		expect(result.rigs).toEqual([]);
		expect(calls[0]?.argv).toEqual(["status", "--json"]);
		expect(calls[1]?.argv).toEqual(["--version"]);
	});

	it("falls back to --version when gt status returns non-JSON", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: "garbage not json", exitCode: 0 },
			{ stdout: "gt version 0.9.0\n", exitCode: 0 },
		]);
		const result = await probe({}, { spawn: spawnFn });
		expect(result.installed).toBe(true);
		expect(result.version).toBe("0.9.0");
		expect(result.townRoot).toBeNull();
		expect(calls).toHaveLength(2);
	});

	it("returns installed=false when gt binary is not on PATH", async () => {
		const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
		const spawnFn = (() => {
			throw enoent;
		}) as unknown as typeof import("node:child_process").spawn;
		const result = await probe({}, { spawn: spawnFn });
		expect(result.installed).toBe(false);
		expect(result.townRoot).toBeNull();
	});
});

describe("rig-scoped calls — townRoot propagation", () => {
	it("listRigs passes townRoot as cwd (town-root scoped)", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: EMPTY_RIG_LIST,
			exitCode: 0,
		});
		await listRigs({ townRoot: "/Users/demo/town" }, {}, { spawn: spawnFn });
		expect(calls[0]?.argv).toEqual(["rig", "list"]);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town");
	});

	it("listPolecats with rig passes townRoot/rig as cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: POLECAT_LIST_EMPTY,
			exitCode: 0,
		});
		await listPolecats(
			{ rig: "alpha", townRoot: "/Users/demo/town" },
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.argv).toEqual(["polecat", "list", "alpha"]);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town/alpha");
	});

	it("listPolecats --all passes townRoot as cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: POLECAT_LIST_EMPTY,
			exitCode: 0,
		});
		await listPolecats(
			{ townRoot: "/Users/demo/town" },
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.argv).toEqual(["polecat", "list", "--all"]);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town");
	});

	it("peek passes rig-scoped cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: PEEK_OUTPUT,
			exitCode: 0,
		});
		await peek(
			{
				rig: "alpha",
				polecat: "quartz",
				townRoot: "/Users/demo/town",
			},
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town/alpha");
	});

	it("sling passes rig-scoped cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: SLING_OUTPUT,
			exitCode: 0,
		});
		await sling(
			{
				rig: "alpha",
				bead: "a-1",
				mergeStrategy: "mr",
				townRoot: "/Users/demo/town",
			},
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town/alpha");
	});

	it("checkRecovery passes rig-scoped cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: RECOVERY_JSON,
			exitCode: 0,
		});
		await checkRecovery(
			{
				rig: "alpha",
				polecat: "quartz",
				townRoot: "/Users/demo/town",
			},
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town/alpha");
	});

	it("nuke passes rig-scoped cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: NUKE_SUCCESS,
			exitCode: 0,
		});
		await nuke(
			{
				rig: "alpha",
				polecat: "quartz",
				townRoot: "/Users/demo/town",
			},
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town/alpha");
	});

	it("explicit options.cwd wins over townRoot", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: PEEK_OUTPUT,
			exitCode: 0,
		});
		await peek(
			{
				rig: "alpha",
				polecat: "quartz",
				townRoot: "/Users/demo/town",
			},
			{ cwd: "/explicit/override" },
			{ spawn: spawnFn },
		);
		expect(calls[0]?.options.cwd).toBe("/explicit/override");
	});

	it("listWorktrees shells out to git -C .repo.git with rig-scoped cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: [
				"worktree /Users/demo/town/alpha/.repo.git",
				"bare",
				"",
				"worktree /Users/demo/town/alpha/polecats/jasper/alpha",
				"HEAD abc",
				"branch refs/heads/polecat/jasper-mo5",
				"",
			].join("\n"),
			exitCode: 0,
		});
		const result = await listWorktrees(
			{ rig: "alpha", townRoot: "/Users/demo/town" },
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.bin).toBe("git");
		expect(calls[0]?.argv).toEqual([
			"-C",
			".repo.git",
			"worktree",
			"list",
			"--porcelain",
		]);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town/alpha");
		expect(result).toHaveLength(2);
		expect(result[1]?.branch).toBe("polecat/jasper-mo5");
	});

	it("falls back to GT_TOWN_ROOT env var when townRoot not supplied", async () => {
		const prev = process.env.GT_TOWN_ROOT;
		process.env.GT_TOWN_ROOT = "/env/town";
		try {
			const { spawnFn, calls } = makeRecordingSpawn({
				stdout: PEEK_OUTPUT,
				exitCode: 0,
			});
			await peek({ rig: "alpha", polecat: "quartz" }, {}, { spawn: spawnFn });
			expect(calls[0]?.options.cwd).toBe("/env/town/alpha");
		} finally {
			if (prev === undefined) delete process.env.GT_TOWN_ROOT;
			else process.env.GT_TOWN_ROOT = prev;
		}
	});
});
