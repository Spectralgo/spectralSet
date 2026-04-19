import { projects, settings, type TerminalPreset } from "@spectralset/local-db";
import { eq } from "drizzle-orm";
import { localDb } from "main/lib/local-db";
import { getDefaultProjectColor } from "../projects/utils/colors";
import { upsertMayorPreset } from "./ensure-project-presets";

export { MAYOR_PRESET_ID, upsertMayorPreset } from "./ensure-project-presets";

export interface EnsureProjectInput {
	townRoot: string;
	townName: string | null;
	tmuxSocket: string | null;
}

export interface EnsureProjectResult {
	projectId: string;
}

/**
 * Upserts the projects row for a Gas Town town and seeds the Mayor
 * terminal preset. Idempotent: re-running for the same townRoot returns
 * the same projectId and does not duplicate the preset.
 */
export function ensureProject(input: EnsureProjectInput): EnsureProjectResult {
	const name = input.townName?.trim() || "Gas Town";

	const existing = localDb
		.select()
		.from(projects)
		.where(eq(projects.mainRepoPath, input.townRoot))
		.get();

	let projectId: string;
	if (existing) {
		localDb
			.update(projects)
			.set({ lastOpenedAt: Date.now() })
			.where(eq(projects.id, existing.id))
			.run();
		projectId = existing.id;
	} else {
		const inserted = localDb
			.insert(projects)
			.values({
				mainRepoPath: input.townRoot,
				name,
				color: getDefaultProjectColor(),
			})
			.returning()
			.get();
		projectId = inserted.id;
	}

	const settingsRow =
		localDb.select().from(settings).get() ??
		localDb.insert(settings).values({ id: 1 }).returning().get();

	const currentPresets = (settingsRow.terminalPresets ??
		[]) as TerminalPreset[];
	const { presets, changed } = upsertMayorPreset({
		presets: currentPresets,
		projectId,
		townRoot: input.townRoot,
		tmuxSocket: input.tmuxSocket,
	});
	if (changed) {
		localDb
			.insert(settings)
			.values({ id: 1, terminalPresets: presets })
			.onConflictDoUpdate({
				target: settings.id,
				set: { terminalPresets: presets },
			})
			.run();
	}

	return { projectId };
}
