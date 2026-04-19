import { expandTilde } from "@spectralset/gastown-cli-client";

// Resolves the user-supplied Town Path override into an absolute cwd.
// `~` expansion must happen in the main process: Node's spawn({ cwd })
// does not expand tildes (shells do), so a literal "~/..." is treated
// as a relative path and lookup fails.
export function resolveTownPath(
	townPath: string | undefined,
): string | undefined {
	const expanded = expandTilde(townPath);
	if (!expanded) return undefined;
	return expanded.replace(/\/+$/, "");
}
