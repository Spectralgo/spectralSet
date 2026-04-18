import { toast } from "@spectralset/ui/sonner";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { invalidateWorkspaceQueries } from "./invalidateWorkspaceQueries";

export function useMoveWorkspacesToSection() {
	const utils = electronTrpc.useUtils();

	return electronTrpc.workspaces.moveWorkspacesToSection.useMutation({
		onSuccess: () => invalidateWorkspaceQueries(utils),
		onError: (error) =>
			toast.error(`Failed to move workspaces: ${error.message}`),
	});
}
