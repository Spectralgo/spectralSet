import { Spinner } from "@spectralset/ui/spinner";
import {
	createFileRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";

export const Route = createFileRoute("/_authenticated/_dashboard/workspace/")({
	component: WorkspaceIndexPage,
});

function LoadingSpinner() {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<Spinner className="size-5" />
		</div>
	);
}

function WorkspaceIndexPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: workspaces, isLoading } =
		electronTrpc.workspaces.getAllGrouped.useQuery();

	const allWorkspaces = workspaces?.flatMap((group) => group.workspaces) ?? [];
	const hasNoWorkspaces = !isLoading && allWorkspaces.length === 0;

	useEffect(() => {
		// Guard: only run workspace auto-navigate when the user is actually on a
		// workspace-root URL. If the _dashboard layout is eclipsing a sibling
		// route like /today (ss-tlc / ss-5v4), we must NOT swap the URL.
		if (!location.pathname.startsWith("/workspace")) {
			return;
		}
		if (isLoading || !workspaces) return;

		if (allWorkspaces.length === 0) {
			// Redirect to clean onboarding screen (no sidebar/topbar)
			navigate({ to: "/welcome", replace: true });
			return;
		}

		// Try to restore last viewed workspace
		const lastViewedId = localStorage.getItem("lastViewedWorkspaceId");
		const targetWorkspace =
			allWorkspaces.find((w) => w.id === lastViewedId) ?? allWorkspaces[0];

		if (targetWorkspace) {
			console.log("[workspace-auto-navigate] firing", {
				from: window.location.hash,
				to: `/workspace/${targetWorkspace.id}`,
				lastViewedId,
				stack: new Error().stack?.split("\n").slice(0, 4).join(" | "),
			});
			navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId: targetWorkspace.id },
				replace: true,
			});
		}
	}, [workspaces, isLoading, navigate, allWorkspaces, location.pathname]);

	if (hasNoWorkspaces) {
		return <LoadingSpinner />;
	}

	return <LoadingSpinner />;
}
