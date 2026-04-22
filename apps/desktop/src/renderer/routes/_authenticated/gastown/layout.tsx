import { Spinner } from "@spectralset/ui/spinner";
import { cn } from "@spectralset/ui/utils";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	useMatchRoute,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronTrpcClient } from "renderer/lib/trpc-client";

const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;

const GASTOWN_TABS = [
	{ to: "/gastown/agents", label: "Agents" },
	{ to: "/gastown/convoys", label: "Convoys" },
	{ to: "/gastown/mail", label: "Mail" },
] as const;

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
			console.log("[gastown-layout] redirect fired");
			navigate({ to: "/today", replace: true });
		}
	}, [guardShouldRedirect, navigate]);

	const awaitingData =
		gastownEnabled === null || (gastownEnabled && probeQuery.isLoading);

	console.log("[gastown-layout]", {
		gastownEnabled,
		probeStatus: probeQuery.status,
		probeIsLoading: probeQuery.isLoading,
		probeIsError: probeQuery.isError,
		probeError: probeQuery.error?.message,
		probe: JSON.stringify(probe),
		probeFailed,
		townUnreachable,
		workspaceNull,
		guardShouldRedirect,
		awaitingData,
		pathname:
			typeof window === "undefined" ? null : window.location.pathname,
	});

	if (awaitingData || guardShouldRedirect) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<Spinner className="size-5" />
			</div>
		);
	}

	console.log("[gastown-layout] outlet render");
	return (
		<div className="flex h-screen w-screen flex-col bg-background">
			<GastownTopBar />
			<div className="min-h-0 flex-1">
				<Outlet />
			</div>
		</div>
	);
}

function GastownTopBar() {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	const isMac = platform === undefined || platform === "darwin";

	const onAgents = Boolean(matchRoute({ to: "/gastown/agents" }));
	const onConvoys = Boolean(matchRoute({ to: "/gastown/convoys" }));
	const onMail = Boolean(matchRoute({ to: "/gastown/mail" }));
	const title = onAgents
		? "Agents"
		: onConvoys
			? "Convoys"
			: onMail
				? "Mail"
				: "Gas Town";

	return (
		<header
			className="drag flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-background pr-3"
			style={{ paddingLeft: isMac ? "88px" : "12px" }}
		>
			<div className="no-drag flex items-center gap-2">
				<button
					type="button"
					onClick={() => navigate({ to: "/today" })}
					className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label="Back to Today"
				>
					<span aria-hidden>←</span>
					<span>Today</span>
				</button>
				<span className="text-muted-foreground/60">/</span>
				<span className="text-xs font-medium">{title}</span>
			</div>
			<nav className="no-drag flex items-center gap-1 text-xs text-muted-foreground">
				{GASTOWN_TABS.map((tab) => {
					const active = Boolean(matchRoute({ to: tab.to }));
					return (
						<button
							key={tab.to}
							type="button"
							onClick={() => navigate({ to: tab.to })}
							className={cn(
								"rounded px-2 py-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								active && "bg-accent text-foreground",
							)}
						>
							{tab.label}
						</button>
					);
				})}
			</nav>
		</header>
	);
}
