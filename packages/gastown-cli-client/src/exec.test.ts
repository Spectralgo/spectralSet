import { describe, expect, it } from "bun:test";
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
