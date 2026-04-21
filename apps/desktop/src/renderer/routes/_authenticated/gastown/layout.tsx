import { Spinner } from "@spectralset/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronTrpcClient } from "renderer/lib/trpc-client";

const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;

export const Route = createFileRoute("/_authenticated/gastown")({
	component: GastownLayout,
});

function GastownLayout() {
	const navigate = useNavigate();
	const gastownEnabledQuery =
		electronTrpc.settings.getGastownEnabled.useQuery();
	const gastownEnabled = gastownEnabledQuery.data?.enabled ?? null;
	const probeQuery = useQuery({
		queryKey: PROBE_QUERY_KEY,
		queryFn: () => electronTrpcClient.gastown.probe.query(),
		enabled: gastownEnabled === true,
	});

	const probe = probeQuery.data ?? null;
	const probeFailed = probeQuery.isError;
	const townUnreachable = probe !== null && !probe.installed;
	const workspaceNull = probe !== null && probe.townRoot === null;
	const guardShouldRedirect =
		gastownEnabled === false ||
		(gastownEnabled === true &&
			!probeQuery.isLoading &&
			(probeFailed || townUnreachable || workspaceNull));

	// Route-guard: prevents /gastown/* from trapping when probe fails or the
	// workspace is unreachable — e.g. persistent history restores a last-URL
	// like /gastown/agents on reload. Redirects to /today, which owns the
	// canonical empty-state and has its own fallback to /workspace.
	useEffect(() => {
		if (guardShouldRedirect) {
			navigate({ to: "/today", replace: true });
		}
	}, [guardShouldRedirect, navigate]);

	const awaitingData =
		gastownEnabled === null || (gastownEnabled && probeQuery.isLoading);

	if (awaitingData || guardShouldRedirect) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<Spinner className="size-5" />
			</div>
		);
	}

	return <Outlet />;
}
