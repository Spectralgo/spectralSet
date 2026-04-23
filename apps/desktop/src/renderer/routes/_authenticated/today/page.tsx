import type { Rig } from "@spectralset/gastown-cli-client";
import { Spinner } from "@spectralset/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MAYOR_ADDRESS } from "renderer/components/Gastown/MailPanel/AddressPicker";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpc } from "renderer/lib/electron-trpc";
import type { MailMessage } from "renderer/lib/gastown/mail-types";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { MailPile } from "./components/MailPile";
import {
	type RigReason,
	type RigStripRow,
	RigsStrip,
} from "./components/RigsStrip";
import { TodayMasthead } from "./components/TodayMasthead";
import { TriageStack } from "./components/TriageStack";
import {
	deriveVerdict,
	filterMailPile,
	VerdictTail,
} from "./components/VerdictTail";

// Matches the sidebar's probe cache so both share a single in-flight request.
const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;

console.log("[today-page] module loaded", { ts: Date.now() });

export const Route = createFileRoute("/_authenticated/today/")({
	component: TodayPage,
});

function TodayPage() {
	console.log("[today-page] mount", {
		pathname: window.location.hash,
		ts: Date.now(),
	});
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

	const branchState = {
		workspaceNull,
		probeFailed,
		townUnreachable,
		gastownEnabled,
	};

	if (awaitingData) {
		console.log("[today-page] branch", "awaitingData", branchState);
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<Spinner className="size-5" />
			</div>
		);
	}

	if (gastownEnabled === false) {
		console.log("[today-page] branch", "gastown-disabled", branchState);
		return <TodayGastownDisabled isMac={isMac} />;
	}
	if (probeFailed || townUnreachable) {
		console.log("[today-page] branch", "gastown-unreachable", branchState);
		return <TodayGastownUnreachable isMac={isMac} error={probeQuery.error} />;
	}
	if (workspaceNull) {
		console.log("[today-page] branch", "no-workspace", branchState);
		return <TodayNoWorkspace isMac={isMac} />;
	}
	console.log("[today-page] branch", "main-content", branchState);

	const lastVerifiedAt = probeQuery.dataUpdatedAt
		? new Date(probeQuery.dataUpdatedAt)
		: null;

	return (
		<div
			data-today-root
			className="flex h-screen w-screen flex-col bg-background"
		>
			<div
				className="drag h-8 w-full shrink-0 bg-background"
				style={{ paddingLeft: isMac ? "88px" : "16px" }}
			/>
			<MastheadRegion lastVerifiedAt={lastVerifiedAt} />
			<div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
				<TriageStack />
				<RigsRegion />
				<MailRegion />
				<VerdictRegion lastVerifiedAt={lastVerifiedAt} />
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

/**
 * Masthead region. `sinceTime` is anchored on mount — per spec-today §5, it
 * should track the user's last foreground transition via local-db, but that
 * wiring lands in a later bead. Mount-anchored sinceTime still yields an
 * honest "since you slept" line (zero counts until the digest stream ticks).
 */
function MastheadRegion({ lastVerifiedAt }: { lastVerifiedAt: Date | null }) {
	const townPath = useGastownTownPath();
	const [sinceTime] = useState(() => new Date().toISOString());
	const digestQuery = electronTrpc.gastown.today.digest.useQuery(
		{ sinceTime, ...(townPath ? { townPath } : {}) },
		{ refetchInterval: 30_000, refetchOnWindowFocus: false },
	);
	const isStale =
		lastVerifiedAt !== null && Date.now() - lastVerifiedAt.getTime() > 30_000;
	return (
		<TodayMasthead
			digest={digestQuery.data}
			lastVerifiedAt={lastVerifiedAt}
			isStale={isStale}
		/>
	);
}

/**
 * Rigs strip region. Always renders a section so the region is visible during
 * loading, error, and empty states — spec-today §3 assigns empty-state copy to
 * the parent (RigsStrip itself stays agnostic and returns null when fed []).
 */
function RigsRegion() {
	const townPath = useGastownTownPath();
	const rigsQuery = electronTrpc.gastown.listRigs.useQuery(
		townPath ? { townPath } : undefined,
		{ refetchInterval: 5_000, refetchOnWindowFocus: false },
	);
	const rows = useMemo<RigStripRow[]>(
		() => (rigsQuery.data ?? []).map(rigToRow),
		[rigsQuery.data],
	);
	let body: React.ReactNode;
	if (rigsQuery.isLoading) {
		body = (
			<div
				aria-hidden="true"
				className="h-4 w-40 animate-pulse rounded bg-muted"
				data-testid="rigs-region-skeleton"
			/>
		);
	} else if (rigsQuery.isError) {
		body = <p className="text-sm text-muted-foreground">Rigs unavailable.</p>;
	} else if (rows.length === 0) {
		body = <p className="text-sm text-muted-foreground">No rigs active</p>;
	} else {
		body = <RigsStrip rigs={rows} />;
	}
	return (
		<section aria-label="Rigs" className="mb-8" data-testid="rigs-region">
			{body}
		</section>
	);
}

function rigToRow(rig: Rig): RigStripRow {
	return { name: rig.name, reason: deriveRigReason(rig) };
}

// Minimal derivation from `listRigs` output. Precise signals (stalled duration,
// ready P0 count, refinery flow state, offline last-seen) require additional
// sources the spec assigns to later beads — this maps the states we can
// observe today and falls through to "quiet".
function deriveRigReason(rig: Rig): RigReason {
	const zombieCount = rig.agents.filter((a) => a.state === "zombie").length;
	if (zombieCount > 0) return { kind: "zombie", count: zombieCount };
	const stalledCount = rig.agents.filter((a) => a.state === "stalled").length;
	if (stalledCount > 0) {
		return { kind: "stalled", duration: "recent", readyCount: 0 };
	}
	if (!rig.witnessRunning && !rig.refineryRunning) {
		return { kind: "offline", lastSeenRelative: "unknown" };
	}
	return { kind: "quiet" };
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

/**
 * Verdict tail region. Derives the mutually-exclusive state (green / amber /
 * red) from live triage + rigs + mail-pile signals per spec-today §3. Red
 * suppresses the tail — the triage stack becomes the tail — per §3.
 */
function VerdictRegion({ lastVerifiedAt }: { lastVerifiedAt: Date | null }) {
	const townPath = useGastownTownPath();
	const triageQuery = electronTrpc.gastown.today.triage.useQuery(
		townPath ? { townPath } : undefined,
		{ refetchInterval: 10_000, refetchOnWindowFocus: false },
	);
	const rigsQuery = electronTrpc.gastown.listRigs.useQuery(
		townPath ? { townPath } : undefined,
		{ refetchInterval: 5_000, refetchOnWindowFocus: false },
	);
	const inboxQuery = electronTrpc.gastown.mail.inbox.useQuery(
		{
			address: MAYOR_ADDRESS,
			unreadOnly: false,
			...(townPath ? { townPath } : {}),
		},
		{ refetchInterval: 10_000, refetchOnWindowFocus: false },
	);
	const isLoading =
		triageQuery.isLoading || rigsQuery.isLoading || inboxQuery.isLoading;
	const isError =
		triageQuery.isError || rigsQuery.isError || inboxQuery.isError;
	const cards = triageQuery.data?.cards ?? [];
	const rigs = rigsQuery.data ?? [];
	const amberRigCount = rigs.filter(
		(r) =>
			r.agents.some((a) => a.state === "stalled" || a.state === "zombie") ||
			(!r.witnessRunning && !r.refineryRunning),
	).length;
	const state = deriveVerdict({
		triageSeverities: cards.map((c) => c.severity),
		amberRigCount,
		mailPileCount: filterMailPile(inboxQuery.data).length,
	});
	return (
		<section aria-label="Verdict" className="mb-8">
			<VerdictTail
				state={state}
				lastVerifiedAt={lastVerifiedAt}
				loading={isLoading}
				error={isError}
			/>
		</section>
	);
}
