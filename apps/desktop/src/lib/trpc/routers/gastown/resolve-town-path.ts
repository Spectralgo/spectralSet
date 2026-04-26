import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expandTilde, findTownRoot } from "@spectralset/gastown-cli-client";

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

// Auto-discovers a Gas Town root for procedures called without an explicit
// townPath: walks up from process.cwd(), then falls back to a persisted user
// setting at <userData>/town-root.json. Returns undefined if neither resolves.
export function discoverTownRoot(): string | undefined {
	const walked = findTownRoot(process.cwd());
	if (walked) return walked;
	try {
		const { app } = require("electron") as typeof import("electron");
		const file = join(app.getPath("userData"), "town-root.json");
		if (!existsSync(file)) return undefined;
		const data = JSON.parse(readFileSync(file, "utf8")) as {
			townRoot?: unknown;
		};
		return typeof data.townRoot === "string" ? data.townRoot : undefined;
	} catch {
		return undefined;
	}
}
