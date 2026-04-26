import type { Rig } from "@spectralset/gastown-cli-client";
import { Spinner } from "@spectralset/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MAYOR_ADDRESS } from "renderer/components/Gastown/MailPanel/AddressPicker";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpc } from "renderer/lib/electron-trpc";
import type { MailMessage } from "renderer/lib/gastown/mail-types";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { MailPile } from "renderer/routes/_authenticated/today/components/MailPile";
import {
	type RigReason,
	type RigStripRow,
	RigsStrip,
} from "renderer/routes/_authenticated/today/components/RigsStrip";
import { TodayMasthead } from "renderer/routes/_authenticated/today/components/TodayMasthead";
import { TriageStack } from "renderer/routes/_authenticated/today/components/TriageStack";
import {
	deriveVerdict,
	filterMailPile,
	VerdictTail,
} from "renderer/routes/_authenticated/today/components/VerdictTail";
import type { BaseTab, Pane } from "shared/tabs-types";

const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;
const EMPTY_RIGS: Rig[] = [];

interface TodayPaneProps {
	pane: Pane;
	tab: BaseTab;
}

export function TodayPane(_props: TodayPaneProps) {
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
	const townPath = useGastownTownPath();
	const tp = townPath || undefined;
	const canQueryToday =
		gastownEnabled === true &&
		probe !== null &&
		probe.installed &&
		probe.townRoot !== null &&
		!probeFailed;
	const [sinceTime] = useState(() => new Date().toISOString());
	const digestQuery = electronTrpc.gastown.today.digest.useQuery(
		{ sinceTime, ...(tp ? { townPath: tp } : {}) },
		{
			enabled: canQueryToday,
			refetchInterval: 30_000,
			refetchOnWindowFocus: false,
		},
	);
	const triageQuery = electronTrpc.gastown.today.triage.useQuery(
		{ userAddress: MAYOR_ADDRESS, ...(tp ? { townPath: tp } : {}) },
		{
			enabled: canQueryToday,
			refetchInterval: 5_000,
			refetchOnWindowFocus: false,
		},
	);
	const rigs = probe?.rigs ?? EMPTY_RIGS;
	const rigsQuery = useMemo(
		() => ({
			data: rigs,
			isLoading: probeQuery.isLoading,
			isError: probeQuery.isError,
		}),
		[rigs, probeQuery.isLoading, probeQuery.isError],
	);
	const inboxQuery = electronTrpc.gastown.mail.inbox.useQuery(
		{
			address: MAYOR_ADDRESS,
			unreadOnly: false,
			...(tp ? { townPath: tp } : {}),
		},
		{
			enabled: canQueryToday,
			refetchInterval: 10_000,
			refetchOnWindowFocus: false,
		},
	);
	const awaitingData =
		gastownEnabled === null || (gastownEnabled && probeQuery.isLoading);
	const lastVerifiedAt = probeQuery.dataUpdatedAt
		? new Date(probeQuery.dataUpdatedAt)
		: null;
	const isStale =
		lastVerifiedAt !== null && Date.now() - lastVerifiedAt.getTime() > 30_000;
	const rigRows = useMemo<RigStripRow[]>(
		() => (rigsQuery.data ?? []).map(rigToRow),
		[rigsQuery.data],
	);
	const mailPile: MailMessage[] = filterMailPile(inboxQuery.data).slice();
	const triageCards = triageQuery.data?.cards ?? [];
	const amberRigCount = (rigsQuery.data ?? []).filter(
		(r) =>
			r.agents.some((a) => a.state === "stalled" || a.state === "zombie") ||
			(!r.witnessRunning && !r.refineryRunning),
	).length;
	const verdictState = deriveVerdict({
		triageSeverities: triageCards.map((c) => c.severity),
		amberRigCount,
		mailPileCount: mailPile.length,
	});
	const verdictLoading =
		triageQuery.isLoading || rigsQuery.isLoading || inboxQuery.isLoading;
	const verdictError =
		triageQuery.isError || rigsQuery.isError || inboxQuery.isError;

	if (awaitingData) {
		return (
			<div className="flex h-full w-full min-w-[320px] items-center justify-center bg-background">
				<Spinner className="size-5" />
			</div>
		);
	}
	if (gastownEnabled === false) return <TodayGastownDisabled />;
	if (probeFailed || townUnreachable) {
		return <TodayGastownUnreachable error={probeQuery.error} />;
	}
	if (workspaceNull) return <TodayNoWorkspace />;

	return (
		<div
			data-today-root
			className="flex h-full w-full min-w-[320px] flex-col bg-background"
		>
			<TodayMasthead
				digest={digestQuery.data}
				lastVerifiedAt={lastVerifiedAt}
				isStale={isStale}
			/>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<TriageStack query={triageQuery} />
				<RigsStrip rigs={rigRows} />
				<MailPile messages={mailPile} townPath={tp} />
				<VerdictTail
					state={verdictState}
					lastVerifiedAt={lastVerifiedAt}
					loading={verdictLoading}
					error={verdictError}
				/>
			</div>
		</div>
	);
}

function rigToRow(rig: Rig): RigStripRow {
	return { name: rig.name, reason: deriveRigReason(rig) };
}

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

function TodayShell({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex h-full w-full min-w-[320px] flex-col bg-background">
			<div className="flex min-h-0 flex-1 flex-col px-8 py-6">
				<h1 className="mb-4 text-base font-medium text-foreground">{title}</h1>
				<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
			</div>
		</div>
	);
}

function TodayGastownDisabled() {
	const navigate = useNavigate();
	return (
		<TodayShell title="Today">
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
	error,
}: {
	error: Error | null | undefined;
}) {
	return (
		<TodayShell title="Today · Gas Town unreachable">
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

function TodayNoWorkspace() {
	return (
		<TodayShell title="Today · no workspace">
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
