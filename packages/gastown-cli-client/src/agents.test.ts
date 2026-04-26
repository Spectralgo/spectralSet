import { describe, expect, it } from "bun:test";
import type { SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { getAgent, getAgentFromSummaries, listAgents } from "./agents";

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

function makeRecordingSpawn(scripts: FakeSpawnScript[]) {
	const calls: SpawnCall[] = [];

	const spawnFn = ((
		bin: string,
		argv: readonly string[],
		options: SpawnOptions,
	) => {
		const child = new EventEmitter() as EventEmitter & {
			stdout: EventEmitter;
			stderr: EventEmitter;
			stdin: { on: () => void; end: () => void };
			kill: () => void;
		};
		child.stdout = new EventEmitter();
		child.stderr = new EventEmitter();
		child.stdin = { on: () => {}, end: () => {} };
		child.kill = () => {};

		calls.push({ bin, argv: [...argv], options });
		const entry = scripts[calls.length - 1] ?? scripts[scripts.length - 1];

		queueMicrotask(() => {
			if (entry?.stdout) child.stdout.emit("data", Buffer.from(entry.stdout));
			if (entry?.stderr) child.stderr.emit("data", Buffer.from(entry.stderr));
		});
		setTimeout(() => child.emit("close", entry?.exitCode ?? 0), 1);

		return child;
	}) as unknown as typeof import("node:child_process").spawn;

	return { spawnFn, calls };
}

const STATUS_JSON = JSON.stringify({
	name: "spectralGasTown",
	location: "/tmp/town",
	agents: [
		{
			name: "mayor",
			address: "mayor/",
			session: "hq-mayor",
			role: "coordinator",
			running: true,
			state: "idle",
			unread_mail: 2,
			first_subject: "HANDOFF",
		},
		{
			name: "deacon",
			address: "deacon/",
			session: "hq-deacon",
			role: "health-check",
			running: true,
			state: "idle",
			unread_mail: 0,
		},
	],
	rigs: [
		{
			name: "spectralSet",
			agents: [
				{
					name: "jasper",
					address: "spectralSet/polecats/jasper",
					session: "ss-jasper",
					role: "polecat",
					running: true,
					state: "working",
					unread_mail: 0,
				},
				{
					name: "witness",
					address: "spectralSet/witness",
					session: "ss-witness",
					role: "witness",
					running: true,
					state: "idle",
					unread_mail: 0,
				},
				{
					// Malformed entry — unknown role. Must be skipped.
					name: "ghost",
					role: "unknown",
				},
			],
		},
	],
});

describe("listAgents", () => {
	it("flattens top-level agents and rig agents, dropping unknown roles", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: STATUS_JSON, exitCode: 0 },
		]);

		const agents = await listAgents({}, {}, { spawn: spawnFn });

		expect(calls[0]?.argv).toEqual(["status", "--json", "--fast"]);
		expect(agents.map((a) => `${a.kind}:${a.name}:${a.rig}`)).toEqual([
			"mayor:mayor:null",
			"deacon:deacon:null",
			"polecat:jasper:spectralSet",
			"witness:witness:spectralSet",
		]);
		const mayor = agents[0];
		expect(mayor?.unreadMail).toBe(2);
		expect(mayor?.firstSubject).toBe("HANDOFF");
	});

	it("returns [] when gt status is not valid JSON", async () => {
		const { spawnFn } = makeRecordingSpawn([
			{ stdout: "not json", exitCode: 0 },
		]);
		const agents = await listAgents({}, {}, { spawn: spawnFn });
		expect(agents).toEqual([]);
	});

	it("throws GastownCliError on non-zero exit", async () => {
		const { spawnFn } = makeRecordingSpawn([
			{ stdout: "", stderr: "boom", exitCode: 1 },
		]);
		await expect(listAgents({}, {}, { spawn: spawnFn })).rejects.toThrow(
			/boom/,
		);
	});

	it("threads townRoot through to execGt cwd", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: STATUS_JSON, exitCode: 0 },
		]);
		await listAgents({ townRoot: "/Users/demo/town" }, {}, { spawn: spawnFn });
		expect(calls[0]?.options.cwd).toBe("/Users/demo/town");
	});
});

const BEAD_JSON = JSON.stringify([
	{
		id: "ss-spectralSet-polecat-jasper",
		title: "ss-spectralSet-polecat-jasper",
		description:
			"ss-spectralSet-polecat-jasper\n\nrole_type: polecat\nrig: spectralSet\nagent_state: working\nhook_bead: ss-e67\ncleanup_status: null\nactive_mr: ss-mr-123\nbranch: polecat/jasper-abc\ncompletion_time: 2026-04-19T20:00:00Z\nexit_type: done\n",
	},
]);

describe("getAgent", () => {
	it("can build detail from supplied summaries without running gt status", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: BEAD_JSON, exitCode: 0 },
		]);

		const detail = await getAgentFromSummaries(
			{ kind: "polecat", rig: "spectralSet", name: "jasper" },
			[
				{
					kind: "polecat",
					name: "jasper",
					address: "spectralSet/polecats/jasper",
					session: "ss-jasper",
					role: "polecat",
					rig: "spectralSet",
					running: true,
					state: "working",
					unreadMail: 0,
					firstSubject: null,
				},
			],
			{},
			{ spawn: spawnFn },
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.bin).toBe("bd");
		expect(calls[0]?.argv).toEqual([
			"show",
			"ss-spectralSet-polecat-jasper",
			"--json",
		]);
		expect(detail.activeMr).toBe("ss-mr-123");
	});

	it("merges summary with parsed bead metadata for a polecat", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: STATUS_JSON, exitCode: 0 },
			{ stdout: BEAD_JSON, exitCode: 0 },
		]);

		const detail = await getAgent(
			{ kind: "polecat", rig: "spectralSet", name: "jasper" },
			{},
			{ spawn: spawnFn },
		);

		expect(calls[0]?.bin).toBe("gt");
		expect(calls[1]?.bin).toBe("bd");
		expect(calls[1]?.argv).toEqual([
			"show",
			"ss-spectralSet-polecat-jasper",
			"--json",
		]);

		expect(detail.kind).toBe("polecat");
		expect(detail.rig).toBe("spectralSet");
		expect(detail.agentBeadId).toBe("ss-spectralSet-polecat-jasper");
		expect(detail.hookBead).toBe("ss-e67");
		expect(detail.activeMr).toBe("ss-mr-123");
		expect(detail.branch).toBe("polecat/jasper-abc");
		expect(detail.cleanupStatus).toBeNull();
		expect(detail.exitType).toBe("done");
		expect(detail.completionTime).toBe("2026-04-19T20:00:00Z");
		expect(detail.recentCompletions).toEqual([]);
	});

	it("returns null metadata fields for top-level mayor (no rig bead)", async () => {
		const { spawnFn, calls } = makeRecordingSpawn([
			{ stdout: STATUS_JSON, exitCode: 0 },
		]);

		const detail = await getAgent(
			{ kind: "mayor", name: "mayor" },
			{},
			{ spawn: spawnFn },
		);

		// Only one exec — there is no rig bead to fetch.
		expect(calls).toHaveLength(1);
		expect(detail.agentBeadId).toBeNull();
		expect(detail.hookBead).toBeNull();
	});

	it("throws when the agent is absent from status", async () => {
		const { spawnFn } = makeRecordingSpawn([
			{ stdout: STATUS_JSON, exitCode: 0 },
		]);
		await expect(
			getAgent(
				{ kind: "polecat", rig: "spectralSet", name: "ghost" },
				{},
				{ spawn: spawnFn },
			),
		).rejects.toThrow(/agent not found/);
	});

	it("falls back to empty metadata when bd show fails", async () => {
		const { spawnFn } = makeRecordingSpawn([
			{ stdout: STATUS_JSON, exitCode: 0 },
			{ stdout: "", stderr: "not found", exitCode: 1 },
		]);

		const detail = await getAgent(
			{ kind: "polecat", rig: "spectralSet", name: "jasper" },
			{},
			{ spawn: spawnFn },
		);

		expect(detail.agentBeadId).toBe("ss-spectralSet-polecat-jasper");
		expect(detail.hookBead).toBeNull();
		expect(detail.branch).toBeNull();
	});
});
