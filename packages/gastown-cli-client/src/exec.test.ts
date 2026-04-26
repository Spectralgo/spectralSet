import { describe, expect, it, spyOn } from "bun:test";
import { EventEmitter } from "node:events";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	execGt,
	expandTilde,
	GastownCliError,
	GastownCliNotInstalledError,
	GastownCliTimeoutError,
} from "./exec";

interface FakeChildOptions {
	stdout?: string;
	stderr?: string;
	exitCode?: number;
	exitDelayMs?: number;
	spawnError?: NodeJS.ErrnoException;
	errorAfterSpawnMs?: number;
	emitError?: NodeJS.ErrnoException;
	neverExit?: boolean;
}

interface ControlledSpawnCall {
	bin: string;
	argv: readonly string[];
	options: import("node:child_process").SpawnOptions;
	stdout: EventEmitter;
	stderr: EventEmitter;
	close: (exitCode?: number | null) => void;
	error: (err: Error) => void;
}

function makeFakeSpawn(opts: FakeChildOptions) {
	let killed = false;
	const child = new EventEmitter() as EventEmitter & {
		stdout: EventEmitter;
		stderr: EventEmitter;
		kill: (signal?: string) => void;
	};
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.kill = () => {
		killed = true;
		setTimeout(() => child.emit("close", null), 0);
	};

	const spawnFn = (() => {
		if (opts.spawnError) throw opts.spawnError;

		queueMicrotask(() => {
			if (opts.stdout) child.stdout.emit("data", Buffer.from(opts.stdout));
			if (opts.stderr) child.stderr.emit("data", Buffer.from(opts.stderr));
		});

		if (opts.emitError) {
			setTimeout(() => child.emit("error", opts.emitError), 0);
		}

		if (!opts.neverExit) {
			setTimeout(() => {
				if (killed) {
					child.emit("close", null);
					return;
				}
				child.emit("close", opts.exitCode ?? 0);
			}, opts.exitDelayMs ?? 1);
		}

		return child;
	}) as unknown as typeof import("node:child_process").spawn;

	return spawnFn;
}

function makeControlledSpawn() {
	const calls: ControlledSpawnCall[] = [];

	const spawnFn = ((
		bin: string,
		argv: readonly string[],
		options: import("node:child_process").SpawnOptions,
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
		child.kill = () => {
			queueMicrotask(() => child.emit("close", null));
		};

		calls.push({
			bin,
			argv: [...argv],
			options,
			stdout: child.stdout,
			stderr: child.stderr,
			close: (exitCode = 0) => child.emit("close", exitCode),
			error: (err) => child.emit("error", err),
		});

		return child;
	}) as unknown as typeof import("node:child_process").spawn;

	return { spawnFn, calls };
}

describe("execGt", () => {
	it("resolves with stdout, stderr, and exit code on success", async () => {
		const spawnFn = makeFakeSpawn({
			stdout: "gt version 1.0.0\n",
			exitCode: 0,
		});
		const result = await execGt(["--version"], {}, { spawn: spawnFn });
		expect(result.stdout).toBe("gt version 1.0.0\n");
		expect(result.exitCode).toBe(0);
	});

	it("rejects with GastownCliNotInstalledError when spawn throws ENOENT", async () => {
		const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
		const spawnFn = makeFakeSpawn({ spawnError: enoent });
		await expect(
			execGt(["--version"], {}, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliNotInstalledError);
	});

	it("rejects with GastownCliNotInstalledError when child emits ENOENT", async () => {
		const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
		const spawnFn = makeFakeSpawn({ emitError: enoent, neverExit: true });
		await expect(
			execGt(["--version"], {}, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliNotInstalledError);
	});

	it("rejects with GastownCliTimeoutError when the command exceeds the timeout", async () => {
		const spawnFn = makeFakeSpawn({ neverExit: true });
		await expect(
			execGt(["rig", "list"], { timeoutMs: 20 }, { spawn: spawnFn }),
		).rejects.toBeInstanceOf(GastownCliTimeoutError);
	});

	it("reports a non-zero exit code without throwing", async () => {
		const spawnFn = makeFakeSpawn({
			stdout: "",
			stderr: "boom\n",
			exitCode: 2,
		});
		const result = await execGt(["rig", "list"], {}, { spawn: spawnFn });
		expect(result.exitCode).toBe(2);
		expect(result.stderr).toBe("boom\n");
	});

	it("suppresses routine spawn logs unless gt spawn debug is enabled", async () => {
		const prev = process.env.SPECTRALSET_GT_SPAWN_DEBUG;
		delete process.env.SPECTRALSET_GT_SPAWN_DEBUG;
		const logSpy = spyOn(console, "log").mockImplementation(() => {});
		try {
			const spawnFn = makeFakeSpawn({ stdout: "ok\n", exitCode: 0 });
			await execGt(["--version"], {}, { spawn: spawnFn });
			expect(
				logSpy.mock.calls.some(([label]) => label === "[gt-spawn] start"),
			).toBe(false);
		} finally {
			logSpy.mockRestore();
			if (prev === undefined) delete process.env.SPECTRALSET_GT_SPAWN_DEBUG;
			else process.env.SPECTRALSET_GT_SPAWN_DEBUG = prev;
		}
	});

	it("emits routine spawn logs when gt spawn debug is enabled", async () => {
		const prev = process.env.SPECTRALSET_GT_SPAWN_DEBUG;
		process.env.SPECTRALSET_GT_SPAWN_DEBUG = "1";
		const logSpy = spyOn(console, "log").mockImplementation(() => {});
		try {
			const spawnFn = makeFakeSpawn({ stdout: "ok\n", exitCode: 0 });
			await execGt(["--version"], {}, { spawn: spawnFn });
			expect(
				logSpy.mock.calls.some(([label]) => label === "[gt-spawn] start"),
			).toBe(true);
		} finally {
			logSpy.mockRestore();
			if (prev === undefined) delete process.env.SPECTRALSET_GT_SPAWN_DEBUG;
			else process.env.SPECTRALSET_GT_SPAWN_DEBUG = prev;
		}
	});

	it("GastownCliError carries argv, exit code, and stderr for callers", () => {
		const err = new GastownCliError({
			argv: ["rig", "list"],
			exitCode: 3,
			stdout: "",
			stderr: "bad things",
		});
		expect(err.argv).toEqual(["rig", "list"]);
		expect(err.exitCode).toBe(3);
		expect(err.stderr).toBe("bad things");
	});

	it("shares one in-flight execution for duplicate read-only calls with the same semantic key", async () => {
		const { spawnFn, calls } = makeControlledSpawn();

		const first = execGt(
			["status", "--json", "--fast"],
			{ cwd: "/town", readOnly: true },
			{ spawn: spawnFn },
		);
		const second = execGt(
			["status", "--json", "--fast"],
			{ cwd: "/town", readOnly: true },
			{ spawn: spawnFn },
		);

		await Promise.resolve();
		expect(calls).toHaveLength(1);

		calls[0]?.stdout.emit("data", Buffer.from('{"ok":true}\n'));
		calls[0]?.close(0);

		const [firstResult, secondResult] = await Promise.all([first, second]);
		expect(firstResult.stdout).toBe('{"ok":true}\n');
		expect(secondResult).toEqual(firstResult);
	});

	it("does not share read-only calls with different cwd, env, stdin, or args", async () => {
		const { spawnFn, calls } = makeControlledSpawn();

		const requests = [
			execGt(
				["rig", "list"],
				{ cwd: "/town-a", readOnly: true },
				{ spawn: spawnFn },
			),
			execGt(
				["rig", "list"],
				{ cwd: "/town-b", readOnly: true },
				{ spawn: spawnFn },
			),
			execGt(
				["rig", "list"],
				{
					cwd: "/town-a",
					env: { ...process.env, GT_TOWN_ROOT: "/other" },
					readOnly: true,
				},
				{ spawn: spawnFn },
			),
			execGt(
				["rig", "list", "--all"],
				{ cwd: "/town-a", readOnly: true },
				{ spawn: spawnFn },
			),
			execGt(
				["rig", "list"],
				{ cwd: "/town-a", stdin: "context", readOnly: true },
				{ spawn: spawnFn },
			),
		];

		await Promise.resolve();
		expect(calls).toHaveLength(5);

		calls.forEach((call) => {
			call.close(0);
		});
		await Promise.all(requests);
	});

	it("clears read-only singleflight entries after the execution settles", async () => {
		const { spawnFn, calls } = makeControlledSpawn();

		const first = execGt(
			["convoy", "list", "--json"],
			{ cwd: "/town", readOnly: true },
			{ spawn: spawnFn },
		);
		await Promise.resolve();
		calls[0]?.stdout.emit("data", Buffer.from("first\n"));
		calls[0]?.close(0);
		await expect(first).resolves.toMatchObject({ stdout: "first\n" });

		const second = execGt(
			["convoy", "list", "--json"],
			{ cwd: "/town", readOnly: true },
			{ spawn: spawnFn },
		);
		await Promise.resolve();
		expect(calls).toHaveLength(2);
		calls[1]?.stdout.emit("data", Buffer.from("second\n"));
		calls[1]?.close(0);
		await expect(second).resolves.toMatchObject({ stdout: "second\n" });
	});

	it("does not retain failed read-only executions forever", async () => {
		const { spawnFn, calls } = makeControlledSpawn();

		const first = execGt(
			["mail", "inbox", "--json", "--all"],
			{ cwd: "/town", readOnly: true },
			{ spawn: spawnFn },
		);
		const duplicate = execGt(
			["mail", "inbox", "--json", "--all"],
			{ cwd: "/town", readOnly: true },
			{ spawn: spawnFn },
		);
		await Promise.resolve();
		expect(calls).toHaveLength(1);
		calls[0]?.error(new Error("spawn failed"));

		await expect(first).rejects.toThrow("spawn failed");
		await expect(duplicate).rejects.toThrow("spawn failed");

		const retry = execGt(
			["mail", "inbox", "--json", "--all"],
			{ cwd: "/town", readOnly: true },
			{ spawn: spawnFn },
		);
		await Promise.resolve();
		expect(calls).toHaveLength(2);
		calls[1]?.stdout.emit("data", Buffer.from("[]"));
		calls[1]?.close(0);
		await expect(retry).resolves.toMatchObject({ stdout: "[]" });
	});

	it("does not singleflight gt calls unless they explicitly opt in as read-only", async () => {
		const { spawnFn, calls } = makeControlledSpawn();

		const first = execGt(["mail", "archive", "hq-a"], {}, { spawn: spawnFn });
		const second = execGt(["mail", "archive", "hq-a"], {}, { spawn: spawnFn });

		await Promise.resolve();
		expect(calls).toHaveLength(2);

		calls.forEach((call) => {
			call.close(0);
		});
		await Promise.all([first, second]);
	});

	it("does not singleflight mutation argv even if a caller marks it read-only", async () => {
		const { spawnFn, calls } = makeControlledSpawn();

		const first = execGt(
			["mail", "archive", "hq-a"],
			{ readOnly: true },
			{ spawn: spawnFn },
		);
		const second = execGt(
			["mail", "archive", "hq-a"],
			{ readOnly: true },
			{ spawn: spawnFn },
		);

		await Promise.resolve();
		expect(calls).toHaveLength(2);

		calls.forEach((call) => {
			call.close(0);
		});
		await Promise.all([first, second]);
	});
});

describe("expandTilde", () => {
	it("returns undefined for undefined", () => {
		expect(expandTilde(undefined)).toBeUndefined();
	});

	it("returns undefined for null", () => {
		expect(expandTilde(null)).toBeUndefined();
	});

	it("returns undefined for empty string", () => {
		expect(expandTilde("")).toBeUndefined();
	});

	it("returns undefined for whitespace-only string", () => {
		expect(expandTilde("   ")).toBeUndefined();
	});

	it("expands bare ~ to homedir()", () => {
		expect(expandTilde("~")).toBe(homedir());
	});

	it("expands ~/ prefix to homedir-joined path", () => {
		expect(expandTilde("~/foo")).toBe(join(homedir(), "foo"));
	});

	it("expands ~/nested/path correctly", () => {
		expect(expandTilde("~/code/spectralGasTown")).toBe(
			join(homedir(), "code/spectralGasTown"),
		);
	});

	it("trims surrounding whitespace before expanding", () => {
		expect(expandTilde("  ~/foo  ")).toBe(join(homedir(), "foo"));
	});

	it("returns absolute paths unchanged", () => {
		expect(expandTilde("/abs/path")).toBe("/abs/path");
	});

	it("returns relative paths unchanged", () => {
		expect(expandTilde("foo/bar")).toBe("foo/bar");
	});

	it("leaves ~user-style prefixes unchanged (out of scope)", () => {
		expect(expandTilde("~bob/foo")).toBe("~bob/foo");
	});
});
