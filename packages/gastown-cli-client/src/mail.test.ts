import { describe, expect, it } from "bun:test";
import type { SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { GastownCliError } from "./exec";
import { listInbox, readMessage, sendMail } from "./mail";

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

const INBOX_JSON = JSON.stringify([
	{
		id: "hq-abc",
		from: "mayor/",
		to: "spectralSet/polecats/jasper",
		subject: "Assignment",
		body: "Work on ss-qs5",
		timestamp: "2026-04-19T20:00:00Z",
		read: false,
		priority: "high",
		type: "notification",
	},
	{
		id: "hq-escalation-1",
		from: "spectralSet/witness",
		to: "mayor/",
		subject: "[HIGH] Dolt down",
		body: "Escalation body",
		timestamp: "2026-04-19T19:00:00Z",
		read: true,
		priority: "high",
		type: "escalation",
		thread_id: "hq-wisp-xyz",
	},
]);

describe("listInbox()", () => {
	it("invokes `gt mail inbox --json --all` and parses the array", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: INBOX_JSON,
			exitCode: 0,
		});
		const result = await listInbox({}, {}, { spawn: spawnFn });
		expect(calls[0]?.bin).toBe("gt");
		expect(calls[0]?.argv).toEqual(["mail", "inbox", "--json", "--all"]);
		expect(result).toHaveLength(2);
		expect(result[0]?.id).toBe("hq-abc");
		expect(result[1]?.type).toBe("escalation");
	});

	it("inserts the address before --json when provided", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({
			stdout: "[]",
			exitCode: 0,
		});
		await listInbox(
			{ address: "mayor/", unreadOnly: true },
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.argv).toEqual([
			"mail",
			"inbox",
			"mayor/",
			"--json",
			"--unread",
		]);
	});

	it("throws GastownCliError on non-zero exit", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stderr: "boom",
			exitCode: 1,
		});
		await expect(listInbox({}, {}, { spawn: spawnFn })).rejects.toBeInstanceOf(
			GastownCliError,
		);
	});
});

describe("readMessage()", () => {
	it("returns the matching message by id", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stdout: INBOX_JSON,
			exitCode: 0,
		});
		const msg = await readMessage({ id: "hq-abc" }, {}, { spawn: spawnFn });
		expect(msg?.subject).toBe("Assignment");
	});

	it("returns null when id is absent", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stdout: INBOX_JSON,
			exitCode: 0,
		});
		const msg = await readMessage({ id: "not-there" }, {}, { spawn: spawnFn });
		expect(msg).toBeNull();
	});
});

describe("sendMail()", () => {
	it("invokes `gt mail send <to> -s <subject> --stdin` with body on stdin", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({ exitCode: 0 });
		await sendMail(
			{ to: "mayor/", subject: "Hello", body: "Body text" },
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.argv).toEqual([
			"mail",
			"send",
			"mayor/",
			"-s",
			"Hello",
			"--stdin",
		]);
	});

	it("maps priority name to numeric flag and appends pinned/type", async () => {
		const { spawnFn, calls } = makeRecordingSpawn({ exitCode: 0 });
		await sendMail(
			{
				to: "spectralSet/refinery",
				subject: "Task",
				body: "Fix bug",
				priority: "urgent",
				type: "task",
				pinned: true,
			},
			{},
			{ spawn: spawnFn },
		);
		expect(calls[0]?.argv).toEqual([
			"mail",
			"send",
			"spectralSet/refinery",
			"-s",
			"Task",
			"--stdin",
			"--pinned",
			"--priority",
			"0",
			"--type",
			"task",
		]);
	});

	it("throws GastownCliError on non-zero exit", async () => {
		const { spawnFn } = makeRecordingSpawn({
			stderr: "send failed",
			exitCode: 2,
		});
		await expect(
			sendMail(
				{ to: "mayor/", subject: "x", body: "y" },
				{},
				{ spawn: spawnFn },
			),
		).rejects.toBeInstanceOf(GastownCliError);
	});
});
