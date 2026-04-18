import {
	type ExecGtDeps,
	type ExecGtOptions,
	execGt,
	GastownCliError,
	GastownCliNotInstalledError,
} from "./exec";
import { parseRigList } from "./parsers/rigs";
import { parseVersion } from "./parsers/version";
import type { ProbeResult, Rig } from "./types";

export {
	GastownCliError,
	GastownCliNotInstalledError,
	GastownCliTimeoutError,
} from "./exec";
export type { ProbeResult, Rig } from "./types";

export interface GastownCliClientOptions extends ExecGtOptions {}

export async function probe(
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<ProbeResult> {
	try {
		const { stdout, exitCode, stderr } = await execGt(
			["--version"],
			options,
			deps,
		);
		if (exitCode !== 0) {
			throw new GastownCliError({
				argv: ["--version"],
				exitCode,
				stdout,
				stderr,
			});
		}
		return { installed: true, version: parseVersion(stdout) };
	} catch (err) {
		if (err instanceof GastownCliNotInstalledError) {
			return { installed: false, version: null };
		}
		throw err;
	}
}

export async function listRigs(
	options: GastownCliClientOptions = {},
	deps: ExecGtDeps = {},
): Promise<Rig[]> {
	const { stdout, stderr, exitCode } = await execGt(
		["rig", "list"],
		options,
		deps,
	);
	if (exitCode !== 0) {
		throw new GastownCliError({
			argv: ["rig", "list"],
			exitCode,
			stdout,
			stderr,
		});
	}
	return parseRigList(stdout);
}
