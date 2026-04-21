import { Spinner } from "@spectralset/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronTrpcClient } from "renderer/lib/trpc-client";

// Matches the sidebar's probe cache so both share a single in-flight request.
const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;

export const Route = createFileRoute("/_authenticated/today/")({
	component: TodayPage,
});

function TodayPage() {
	const navigate = useNavigate();
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
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

	// Route-guard: workspace-null / probe-failed / town-unreachable → /workspace
	// (which itself bounces to /welcome when no workspaces exist). Prevents the
	// "Failed to load" dead-end per ss-fa4 / ss-trap-router.
	useEffect(() => {
		if (guardShouldRedirect) {
			navigate({ to: "/workspace", replace: true });
		}
	}, [guardShouldRedirect, navigate]);

	const isMac = platform === undefined || platform === "darwin";
	const awaitingData =
		gastownEnabled === null || (gastownEnabled && probeQuery.isLoading);

	if (awaitingData || guardShouldRedirect) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<Spinner className="size-5" />
			</div>
		);
	}

	return (
		<div className="flex h-screen w-screen flex-col bg-background">
			<div
				className="drag h-8 w-full shrink-0 bg-background"
				style={{ paddingLeft: isMac ? "88px" : "16px" }}
			/>
			<div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
				<div className="mb-6">
					<h1 className="text-base font-medium text-foreground">Today</h1>
					<p className="text-xs text-muted-foreground">
						Last verified just now
					</p>
				</div>
				<RegionPlaceholder label="Triage" />
				<RegionPlaceholder label="Rigs" />
				<RegionPlaceholder label="Mail" />
				<RegionPlaceholder label="Verdict" />
			</div>
		</div>
	);
}

function RegionPlaceholder({ label }: { label: string }) {
	return (
		<section aria-label={label} className="mb-8">
			<h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</h2>
			<p className="text-xs text-muted-foreground">No content yet.</p>
		</section>
	);
}
