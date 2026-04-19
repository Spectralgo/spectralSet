import {
	projects,
	workspaces,
	worktrees as worktreesTable,
} from "@spectralset/local-db";
import { and, eq } from "drizzle-orm";
import { localDb } from "main/lib/local-db";
import {
	findArchivedPolecats,
	type PolecatWorkspaceSpec,
} from "./polecat-discovery";

export interface ReconcileResult {
	registered: string[];
	updated: string[];
	archived: string[];
}

/**
 * Writes the reconciled polecat workspace rows into local-db. Kept in
 * its own module so tests of the gastown router can import the router
 * without dragging the electron-main-only `localDb` module (which pulls
 * in better-sqlite3 + the electron `app` export) at evaluation time.
 */
export function applyReconciliation(opts: {
	projectId: string;
	specs: readonly PolecatWorkspaceSpec[];
}): ReconcileResult {
	const registered: string[] = [];
	const updated: string[] = [];

	const existingRows = localDb
		.select({
			id: workspaces.id,
			gastownPolecatName: workspaces.gastownPolecatName,
			worktreeId: workspaces.worktreeId,
		})
		.from(workspaces)
		.where(
			and(
				eq(workspaces.projectId, opts.projectId),
				eq(workspaces.type, "polecat"),
			),
		)
		.all();

	const existingByName = new Map<string, (typeof existingRows)[number]>();
	for (const row of existingRows) {
		if (row.gastownPolecatName) existingByName.set(row.gastownPolecatName, row);
	}

	const now = Date.now();

	for (const spec of opts.specs) {
		const existing = existingByName.get(spec.polecatName);
		if (existing) {
			localDb
				.update(workspaces)
				.set({
					gastownState: spec.state,
					gastownBeadId: spec.beadId,
					gastownBranch: spec.branch,
					gastownLastSyncedAt: now,
					updatedAt: now,
				})
				.where(eq(workspaces.id, existing.id))
				.run();
			updated.push(spec.polecatName);
			continue;
		}

		const worktreeRow = localDb
			.insert(worktreesTable)
			.values({
				projectId: opts.projectId,
				path: spec.worktreePath,
				branch: spec.branch ?? `polecat/${spec.polecatName}`,
				baseBranch: "main",
				gitStatus: null,
				createdBySpectralset: false,
			})
			.returning()
			.get();

		const maxTabOrder = localDb
			.select({ tabOrder: workspaces.tabOrder })
			.from(workspaces)
			.where(eq(workspaces.projectId, opts.projectId))
			.all()
			.reduce((max, r) => (r.tabOrder > max ? r.tabOrder : max), 0);

		localDb
			.insert(workspaces)
			.values({
				projectId: opts.projectId,
				worktreeId: worktreeRow.id,
				type: "polecat",
				branch: spec.branch ?? `polecat/${spec.polecatName}`,
				name: spec.polecatName,
				tabOrder: maxTabOrder + 1,
				gastownTown: spec.town,
				gastownRig: spec.rig,
				gastownPolecatName: spec.polecatName,
				gastownBeadId: spec.beadId,
				gastownBranch: spec.branch,
				gastownState: spec.state,
				gastownLastSyncedAt: now,
			})
			.run();
		registered.push(spec.polecatName);
	}

	const knownMap = new Map<string, PolecatWorkspaceSpec>();
	for (const spec of opts.specs) knownMap.set(spec.polecatName, spec);
	const archivedNames = findArchivedPolecats({
		known: knownMap,
		existingRows,
	});

	for (const name of archivedNames) {
		const row = existingByName.get(name);
		if (!row) continue;
		localDb
			.update(workspaces)
			.set({
				gastownState: "nuked",
				gastownLastSyncedAt: now,
				deletingAt: now,
				updatedAt: now,
			})
			.where(eq(workspaces.id, row.id))
			.run();
	}

	// Silence unused-import warning — `projects` is reserved for a
	// follow-up that auto-attaches via remote-origin URL.
	void projects;

	return { registered, updated, archived: archivedNames };
}
