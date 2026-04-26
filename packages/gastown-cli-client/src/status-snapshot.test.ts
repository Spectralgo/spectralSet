import { describe, expect, it } from "bun:test";
import type { SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { readStatusSnapshot } from "./status-snapshot";

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
	agents: [
		{
			name: "mayor",
			address: "mayor/",
			session: "hq-mayor",
			role: "coordinator",
			running: true,
			state: "idle",
			unread_mail: 1,
			first_subject: "HANDOFF",
		},
	],
	rigs: [
		{
			name: "alpha",
			polecat_count: 1,
			crew_count: 0,
			has_witness: true,
			has_refinery: true,
			agents: [
				{
					name: "jasper",
					address: "alpha/polecats/jasper",
					session: "alpha-jasper",
					role: "polecat",
					running: true,
					state: "working",
					unread_mail: 0,
				},
			],
		},
	],
});

describe("readStatusSnapshot", () => {
	it("derives probe and agents from one gt status call", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: STATUS_JSON,
			exitCode: 0,
		});

		const snapshot = await readStatusSnapshot(
			{ townRoot: "/Users/demo/town" },
			{},
			{ spawn: spawnFn },
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.argv).toEqual(["status", "--json", "--fast"]);
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town");
		expect(snapshot.probe).toMatchObject({
			installed: true,
			townRoot: "/Users/demo/town",
			townName: "demo",
			daemonRunning: true,
			doltRunning: true,
		});
		expect(snapshot.probe.rigs[0]).toMatchObject({
			name: "alpha",
			polecatCount: 1,
			agents: [
				{
					rig: "alpha",
					name: "jasper",
					role: "polecat",
					state: "working",
					running: true,
				},
			],
		});
		expect(
			snapshot.agents.map((agent) => `${agent.kind}:${agent.name}`),
		).toEqual(["mayor:mayor", "polecat:jasper"]);
	});

	it("falls back to version metadata and no agents when status is unavailable", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: "", stderr: "not in a Gas Town workspace\n", exitCode: 1 },
			{ stdout: "gt version 1.2.3\n", exitCode: 0 },
		]);

		const snapshot = await readStatusSnapshot({}, {}, { spawn: spawnFn });

		expect(calls.map((call) => call.argv)).toEqual([
			["status", "--json", "--fast"],
			["--version"],
		]);
		expect(snapshot.probe).toMatchObject({
			installed: true,
			version: "1.2.3",
			townRoot: null,
		});
		expect(snapshot.agents).toEqual([]);
	});
});
