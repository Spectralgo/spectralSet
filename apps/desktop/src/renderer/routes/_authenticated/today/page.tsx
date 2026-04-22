import { Spinner } from "@spectralset/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MAYOR_ADDRESS } from "renderer/components/Gastown/MailPanel/AddressPicker";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpc } from "renderer/lib/electron-trpc";
import type { MailMessage } from "renderer/lib/gastown/mail-types";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { MailPile } from "./components/MailPile";

// Matches the sidebar's probe cache so both share a single in-flight request.
const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;

export const Route = createFileRoute("/_authenticated/today/")({
	component: TodayPage,
});

function TodayPage() {
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

	const isMac = platform === undefined || platform === "darwin";
	const awaitingData =
		gastownEnabled === null || (gastownEnabled && probeQuery.isLoading);

	if (awaitingData) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<Spinner className="size-5" />
			</div>
		);
	}

	if (gastownEnabled === false) {
		return <TodayGastownDisabled isMac={isMac} />;
	}
	if (probeFailed || townUnreachable) {
		return <TodayGastownUnreachable isMac={isMac} error={probeQuery.error} />;
	}
	if (workspaceNull) {
		return <TodayNoWorkspace isMac={isMac} />;
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
				<MailRegion />
				<RegionPlaceholder label="Verdict" />
			</div>
		</div>
	);
}

function TodayShell({
	title,
	isMac,
	children,
}: {
	title: string;
	isMac: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex h-screen w-screen flex-col bg-background">
			<div
				className="drag h-8 w-full shrink-0 bg-background"
				style={{ paddingLeft: isMac ? "88px" : "16px" }}
			/>
			<div className="flex min-h-0 flex-1 flex-col px-8 py-6">
				<h1 className="mb-4 text-base font-medium text-foreground">{title}</h1>
				<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
			</div>
		</div>
	);
}

function TodayGastownDisabled({ isMac }: { isMac: boolean }) {
	const navigate = useNavigate();
	return (
		<TodayShell title="Today" isMac={isMac}>
			<div className="flex flex-col items-start gap-3">
				<p className="text-sm text-muted-foreground">
					Gas Town is disabled. Enable it to see agent activity, mail, and
					convoys.
				</p>
				<button
					type="button"
					onClick={() => navigate({ to: "/settings/integrations" })}
					className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Enable Gas Town
				</button>
			</div>
		</TodayShell>
	);
}

function TodayGastownUnreachable({
	isMac,
	error,
}: {
	isMac: boolean;
	error: Error | null | undefined;
}) {
	return (
		<TodayShell title="Today · Gas Town unreachable" isMac={isMac}>
			<div className="flex flex-col items-start gap-2">
				<p className="text-sm text-destructive">
					Gas Town CLI isn't responding.
				</p>
				{error ? (
					<p className="text-xs text-muted-foreground">{error.message}</p>
				) : null}
				<p className="text-xs text-muted-foreground">
					Check that the `gt` binary is installed and the Dolt server is
					running.
				</p>
			</div>
		</TodayShell>
	);
}

function TodayNoWorkspace({ isMac }: { isMac: boolean }) {
	return (
		<TodayShell title="Today · no workspace" isMac={isMac}>
			<div className="flex flex-col items-start gap-2">
				<p className="text-sm text-foreground">
					No Gas Town workspace detected.
				</p>
				<p className="text-xs text-muted-foreground">
					Open a town root in your terminal (`cd &lt;town&gt;`) and relaunch, or
					set one in Settings.
				</p>
			</div>
		</TodayShell>
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

/**
 * Mail pile region. "Unprocessed" = inbox minus pinned (pinned mail lives in
 * the triage stack per spec-today §5). An empty pile renders nothing so the
 * row disappears per spec-today §3 ("Mail pile empty: row disappears").
 */
function MailRegion() {
	const townPath = useGastownTownPath();
	const inboxQuery = electronTrpc.gastown.mail.inbox.useQuery(
		{
			address: MAYOR_ADDRESS,
			unreadOnly: false,
			...(townPath ? { townPath } : {}),
		},
		{ refetchInterval: 10_000, refetchOnWindowFocus: false },
	);
	const pile: MailMessage[] = (inboxQuery.data ?? []).filter(
		(m) => m.priority !== "urgent" && m.priority !== "high",
	);
	if (inboxQuery.isError || pile.length === 0) return null;
	return (
		<section aria-label="Mail" className="mb-8">
			<MailPile messages={pile} townPath={townPath || undefined} />
		</section>
	);
}
