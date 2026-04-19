import { type SpawnOptions, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_TIMEOUT_MS = 5_000;

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
	return execBin("gt", argv, options, deps);
}

export function execBd(
	argv: readonly string[],
	options: ExecGtOptions = {},
	deps: ExecGtDeps = {},
): Promise<ExecGtResult> {
	return execBin("bd", argv, options, deps);
}

function isEnoent(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code?: string }).code === "ENOENT"
	);
}
