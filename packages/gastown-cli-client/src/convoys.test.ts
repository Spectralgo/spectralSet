import { describe, expect, it } from "bun:test";
import type { SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { convoyStatus, listConvoys } from "./convoys";
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

describe("listConvoys()", () => {
	it("invokes `gt convoy list --json` and parses the array", async () => {
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

	it("appends --all when args.all is true", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: "[]",
			exitCode: 0,
		});
		await listConvoys({ all: true }, {}, { spawn: spawnFn });
		expect(calls[0]?.argv).toEqual(["convoy", "list", "--json", "--all"]);
	});

	it("appends --status=<value> when args.status is set", async () => {
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
