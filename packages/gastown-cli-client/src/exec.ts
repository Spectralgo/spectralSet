import { type SpawnOptions, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

// Timeout bumped to 30s after observing gt status --json take ~12s
// against a warm Dolt backend in this town. 5s was the old default and
// caused silent fallback to gt --version (missing rigs + townRoot).
export const DEFAULT_TIMEOUT_MS = 30_000;

export function expandTilde(p: string | undefined | null): string | undefined {
	if (p == null) return undefined;
	const trimmed = p.trim();
	if (trimmed === "") return undefined;
	if (trimmed === "~") return homedir();
	if (trimmed.startsWith("~/")) return join(homedir(), trimmed.slice(2));
	return trimmed;
}

export interface ExecGtOptions {
	timeoutMs?: number;
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	stdin?: string;
	readOnly?: boolean;
}

export interface ExecGtResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export class GastownCliError extends Error {
	readonly exitCode: number;
	readonly stderr: string;
	readonly stdout: string;
	readonly argv: readonly string[];

	constructor(params: {
		argv: readonly string[];
		exitCode: number;
		stdout: string;
		stderr: string;
		message?: string;
	}) {
		super(
			params.message ??
				`gt ${params.argv.join(" ")} exited ${params.exitCode}: ${params.stderr.trim()}`,
		);
		this.name = "GastownCliError";
		this.argv = params.argv;
		this.exitCode = params.exitCode;
		this.stdout = params.stdout;
		this.stderr = params.stderr;
	}
}

export class GastownCliNotInstalledError extends Error {
	constructor(message = "gt binary not found on PATH") {
		super(message);
		this.name = "GastownCliNotInstalledError";
	}
}

export class GastownCliTimeoutError extends Error {
	readonly argv: readonly string[];
	readonly timeoutMs: number;

	constructor(argv: readonly string[], timeoutMs: number) {
		super(`gt ${argv.join(" ")} timed out after ${timeoutMs}ms`);
		this.name = "GastownCliTimeoutError";
		this.argv = argv;
		this.timeoutMs = timeoutMs;
	}
}

export type SpawnLike = typeof spawn;

export interface ExecGtDeps {
	spawn?: SpawnLike;
}

const gtReadOnlySingleflight = new Map<string, Promise<ExecGtResult>>();
const spawnDepIds = new WeakMap<SpawnLike, number>();
let nextSpawnDepId = 1;

function gtSpawnDebugEnabled(): boolean {
	return process.env.SPECTRALSET_GT_SPAWN_DEBUG === "1";
}

let livenessProbed = false;
async function runLivenessProbe(
	env: NodeJS.ProcessEnv | undefined,
): Promise<void> {
	if (livenessProbed) return;
	livenessProbed = true;
	const effectiveEnv = env ?? process.env;
	const whichResult = await new Promise<string>((resolve) => {
		const child = spawn("/usr/bin/which", ["gt"], {
			env: effectiveEnv,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let buf = "";
		child.stdout?.on("data", (d) => {
			buf += d.toString("utf8");
		});
		child.on("error", () => resolve("<which-error>"));
		child.on("close", () => resolve(buf.trim()));
		setTimeout(() => {
			try {
				child.kill("SIGKILL");
			} catch {}
			resolve("<which-timeout>");
		}, 3000);
	});
	const versionResult = await new Promise<{
		out: string;
		elapsedMs: number;
		timedOut: boolean;
	}>((resolve) => {
		const t0 = Date.now();
		const binPath =
			whichResult && !whichResult.startsWith("<") ? whichResult : "gt";
		const child = spawn(binPath, ["--version"], {
			env: effectiveEnv,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let out = "";
		child.stdout?.on("data", (d) => {
			out += d.toString("utf8");
		});
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			try {
				child.kill("SIGKILL");
			} catch {}
		}, 5000);
		child.on("error", () => {
			clearTimeout(timer);
			resolve({ out: "<version-error>", elapsedMs: Date.now() - t0, timedOut });
		});
		child.on("close", () => {
			clearTimeout(timer);
			resolve({ out: out.trim(), elapsedMs: Date.now() - t0, timedOut });
		});
	});
	if (gtSpawnDebugEnabled()) {
		console.log("[gt-spawn] liveness", {
			which: whichResult,
			version: versionResult,
		});
	}
}

function execBin(
	bin: string,
	argv: readonly string[],
	options: ExecGtOptions,
	deps: ExecGtDeps,
): Promise<ExecGtResult> {
	const spawnFn = deps.spawn ?? spawn;
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const hasStdin = typeof options.stdin === "string";

	const spawnOptions: SpawnOptions = {
		cwd: options.cwd,
		env: options.env ?? process.env,
		stdio: [hasStdin ? "pipe" : "ignore", "pipe", "pipe"],
	};

	if (bin === "gt") {
		void runLivenessProbe(options.env).catch((e) => {
			if (!gtSpawnDebugEnabled()) return;
			console.error(
				"[gt-spawn] liveness-err",
				e instanceof Error ? e.message : String(e),
			);
		});
	}

	const startedAt = Date.now();
	if (gtSpawnDebugEnabled()) {
		console.log("[gt-spawn] start", {
			bin,
			argv: argv.slice(0, 6),
			cwd: options.cwd ?? "<inherit>",
			envHas: {
				PATH: Boolean(options.env?.PATH ?? process.env.PATH),
				HOME: Boolean(options.env?.HOME ?? process.env.HOME),
				GT_TOWN_ROOT: Boolean(
					options.env?.GT_TOWN_ROOT ?? process.env.GT_TOWN_ROOT,
				),
				TMUX: Boolean(options.env?.TMUX ?? process.env.TMUX),
			},
			pathHead: (options.env?.PATH ?? process.env.PATH ?? "").slice(0, 120),
			timeoutMs,
		});
	}

	return new Promise<ExecGtResult>((resolve, reject) => {
		let child: ReturnType<SpawnLike>;
		try {
			child = spawnFn(bin, [...argv], spawnOptions);
		} catch (err) {
			if (isEnoent(err)) {
				reject(
					new GastownCliNotInstalledError(`${bin} binary not found on PATH`),
				);
				return;
			}
			reject(err instanceof Error ? err : new Error(String(err)));
			return;
		}

		let stdout = "";
		let stderr = "";
		let settled = false;
		let timedOut = false;

		const timer = setTimeout(() => {
			timedOut = true;
			console.error("[gt-spawn] TIMEOUT", {
				bin,
				argv: argv.slice(0, 6),
				elapsedMs: Date.now() - startedAt,
				stdoutBytes: stdout.length,
				stderrBytes: stderr.length,
				stderrTail: stderr.slice(-400),
				pid: child.pid,
			});
			child.kill("SIGKILL");
		}, timeoutMs);

		child.stdout?.on("data", (chunk) => {
			stdout += chunk.toString("utf8");
		});
		child.stderr?.on("data", (chunk) => {
			stderr += chunk.toString("utf8");
		});

		child.on("error", (err) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			if (isEnoent(err)) {
				reject(
					new GastownCliNotInstalledError(`${bin} binary not found on PATH`),
				);
				return;
			}
			reject(err);
		});

		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			if (timedOut) {
				reject(new GastownCliTimeoutError(argv, timeoutMs));
				return;
			}
			const exitCode = code ?? -1;
			const elapsedMs = Date.now() - startedAt;
			if (gtSpawnDebugEnabled() || elapsedMs > 10_000) {
				console.log("[gt-spawn] slow-exit", {
					bin,
					argv: argv.slice(0, 6),
					elapsedMs,
					exitCode,
				});
			}
			resolve({ stdout, stderr, exitCode });
		});

		if (hasStdin && child.stdin) {
			child.stdin.on("error", () => {
				// Ignore EPIPE when the child exits before consuming stdin.
			});
			child.stdin.end(options.stdin ?? "");
		}
	});
}

export function execGt(
	argv: readonly string[],
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<ExecGtResult> {
	if (!options.readOnly || !isSingleflightReadOnlyGtArgv(argv)) {
		return execBin("gt", argv, options, deps);
	}

	const key = makeReadOnlyGtKey(argv, options, deps);
	const existing = gtReadOnlySingleflight.get(key);
	if (existing) return existing;

	let shared: Promise<ExecGtResult>;
	shared = execBin("gt", argv, options, deps).finally(() => {
		if (gtReadOnlySingleflight.get(key) === shared) {
			gtReadOnlySingleflight.delete(key);
		}
	});
	gtReadOnlySingleflight.set(key, shared);
	return shared;
}

export function execBd(
	argv: readonly string[],
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<ExecGtResult> {
	return execBin("bd", argv, options, deps);
}

export function execGit(
	argv: readonly string[],
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<ExecGtResult> {
	return execBin("git", argv, options, deps);
}

function isEnoent(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code?: string }).code === "ENOENT"
	);
}

function makeReadOnlyGtKey(
	argv: readonly string[],
	options: ExecGtOptions,
	deps: ExecGtDeps,
): string {
	const payload = {
		bin: "gt",
		argv,
		cwd: options.cwd ?? null,
		env: stableEnv(options.env ?? process.env),
		stdin: options.stdin ?? null,
		timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		spawnDepId: deps.spawn ? getSpawnDepId(deps.spawn) : null,
	};
	return createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("base64url");
}

function stableEnv(env: NodeJS.ProcessEnv): [string, string | null][] {
	return Object.keys(env)
		.sort()
		.map((key) => [key, env[key] ?? null]);
}

function getSpawnDepId(spawnFn: SpawnLike): number {
	const existing = spawnDepIds.get(spawnFn);
	if (existing) return existing;
	const id = nextSpawnDepId;
	nextSpawnDepId += 1;
	spawnDepIds.set(spawnFn, id);
	return id;
}

function isSingleflightReadOnlyGtArgv(argv: readonly string[]): boolean {
	const [command, subcommand] = argv;
	if (command === "status") {
		return argv.includes("--json") && argv.includes("--fast");
	}
	if (command === "rig") {
		return subcommand === "list";
	}
	if (command === "polecat") {
		return subcommand === "list";
	}
	if (command === "mail") {
		return subcommand === "inbox";
	}
	if (command === "convoy") {
		return subcommand === "list" || subcommand === "status";
	}
	return false;
}
