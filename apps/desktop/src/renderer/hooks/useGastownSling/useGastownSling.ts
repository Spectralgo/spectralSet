import type { MergeStrategy } from "@spectralset/gastown-cli-client";
import { toast } from "@spectralset/ui/sonner";
import { useCallback, useState } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronTrpcClient } from "renderer/lib/trpc-client";

export type SlingPhase =
	| "idle"
	| "slinging"
	| "reconciling"
	| "switching"
	| "done"
	| "warning"
	| "error";

export interface SlingInput {
	rig: string;
	bead: string;
	mergeStrategy: MergeStrategy;
	notes?: string;
}

export interface UseGastownSlingParams {
	projectId: string | null;
	townPath?: string;
	onComplete: () => void;
}

const RECONCILE_RETRY_DELAY_MS = 1500;

export function useGastownSling({
	projectId,
	townPath,
	onComplete,
}: UseGastownSlingParams) {
	const utils = electronTrpc.useUtils();
	const [phase, setPhase] = useState<SlingPhase>("idle");
	const [polecatName, setPolecatName] = useState<string | null>(null);
	const [lastInput, setLastInput] = useState<SlingInput | null>(null);

	const sling = useCallback(
		async (input: SlingInput) => {
			if (!projectId) {
				toast.error("Select a project before slinging a polecat.");
				setPhase("error");
				return;
			}
			setLastInput(input);
			setPolecatName(null);
			setPhase("slinging");
			try {
				const slung = await electronTrpcClient.gastown.sling.mutate({
					rig: input.rig,
					bead: input.bead,
					mergeStrategy: input.mergeStrategy,
					notes: input.notes,
					...(townPath ? { townPath } : {}),
				});
				setPolecatName(slung.polecat);
				toast.success(`Slung ${input.bead} to ${slung.polecat}`);

				setPhase("reconciling");
				const findWorkspace = async () => {
					const rows = await electronTrpcClient.workspaces.getAll.query();
					return rows.find(
						(row) =>
							row.gastownRig === input.rig &&
							row.gastownPolecatName === slung.polecat,
					);
				};

				await electronTrpcClient.gastown.reconcile.mutate({
					rig: input.rig,
					projectId,
					...(townPath ? { townPath } : {}),
				});
				await utils.workspaces.getAllGrouped.invalidate();

				let match = await findWorkspace();
				if (!match) {
					await new Promise((r) => setTimeout(r, RECONCILE_RETRY_DELAY_MS));
					await electronTrpcClient.gastown.reconcile.mutate({
						rig: input.rig,
						projectId,
						...(townPath ? { townPath } : {}),
					});
					await utils.workspaces.getAllGrouped.invalidate();
					match = await findWorkspace();
				}

				if (!match) {
					setPhase("warning");
					toast.warning(
						`Polecat ${slung.polecat} ready, but not yet indexed. Retry to reconcile.`,
					);
					return;
				}

				setPhase("switching");
				await electronTrpcClient.workspaces.setActive.mutate({
					workspaceId: match.id,
				});
				setPhase("done");
				onComplete();
			} catch (err) {
				const message = err instanceof Error ? err.message : "Sling failed";
				toast.error(message);
				setPhase("error");
			}
		},
		[projectId, townPath, utils, onComplete],
	);

	const retry = useCallback(() => {
		if (lastInput) void sling(lastInput);
	}, [lastInput, sling]);

	const reset = useCallback(() => {
		setPhase("idle");
		setPolecatName(null);
	}, []);

	const isPending =
		phase === "slinging" || phase === "reconciling" || phase === "switching";

	return {
		sling,
		retry,
		reset,
		phase,
		polecatName,
		isPending,
	};
}
