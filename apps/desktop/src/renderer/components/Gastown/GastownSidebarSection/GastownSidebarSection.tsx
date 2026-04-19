import { getRigPrefix, type Polecat } from "@spectralset/gastown-cli-client";
import { Button } from "@spectralset/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@spectralset/ui/collapsible";
import { toast } from "@spectralset/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
	HiChevronDown,
	HiChevronRight,
	HiOutlineArrowPath,
} from "react-icons/hi2";
import {
	NudgeDialog,
	type NudgeTarget,
} from "renderer/components/Gastown/NudgeDialog";
import {
	NukeConfirmDialog,
	type NukeTarget,
} from "renderer/components/Gastown/NukeConfirmDialog";
import {
	PolecatPeekDrawer,
	type PolecatPeekTarget,
} from "renderer/components/Gastown/PolecatPeekDrawer";
import { PolecatRow } from "renderer/components/Gastown/PolecatRow";
import { useCreateOrAttachWithTheme } from "renderer/hooks/useCreateOrAttachWithTheme";
import { useGastownFleet } from "renderer/hooks/useGastownFleet";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { attachToAgent, buildTmuxSessionName } from "renderer/lib/gastown";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useTabsStore } from "renderer/stores/tabs/store";

// Shares the key with GastownCard so toggle + sidebar read the same cache.
const ENABLED_QUERY_KEY = ["electron", "settings", "gastownEnabled"] as const;

export function GastownSidebarSection() {
	const enabledQuery = useQuery({
		queryKey: ENABLED_QUERY_KEY,
		queryFn: () => electronTrpcClient.settings.getGastownEnabled.query(),
	});

	const enabled = enabledQuery.data?.enabled ?? false;

	if (!enabled) return null;

	return <GastownSidebarSectionBody />;
}

function GastownSidebarSectionBody() {
	const [open, setOpen] = useState(true);
	const [peekTarget, setPeekTarget] = useState<PolecatPeekTarget | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [nukeTarget, setNukeTarget] = useState<NukeTarget | null>(null);
	const [nukeOpen, setNukeOpen] = useState(false);
	const [nudgeTarget, setNudgeTarget] = useState<NudgeTarget | null>(null);
	const [nudgeOpen, setNudgeOpen] = useState(false);

	const fleetQuery = useGastownFleet({ enabled: true });
	const polecats = fleetQuery.data ?? [];
	const rigs = useMemo(() => groupByRig(polecats), [polecats]);

	const townPath = useGastownTownPath();
	const probeQuery = electronTrpc.gastown.probe.useQuery(
		townPath ? { townPath } : undefined,
	);
	const tmuxSocket = probeQuery.data?.tmuxSocket ?? null;

	const { workspaceId: activeWorkspaceId } = useParams({ strict: false }) as {
		workspaceId?: string;
	};
	const addTab = useTabsStore((s) => s.addTab);
	const setTabAutoTitle = useTabsStore((s) => s.setTabAutoTitle);
	const setActiveTab = useTabsStore((s) => s.setActiveTab);
	const createOrAttach = useCreateOrAttachWithTheme();
	const writeToTerminal = electronTrpc.terminal.write.useMutation();

	const handleAttach = useCallback(
		async (polecat: Polecat) => {
			if (!activeWorkspaceId) {
				toast.error(
					"Open a workspace first — terminal tabs are workspace-scoped.",
				);
				return;
			}
			if (!tmuxSocket) {
				toast.error(
					"No Gas Town tmux session found. Start one via `gt` before attaching.",
				);
				return;
			}
			const rigPrefix = getRigPrefix(polecat.rig);
			const sessionName = buildTmuxSessionName(rigPrefix, polecat.name);
			try {
				await attachToAgent(
					{
						rig: polecat.rig,
						polecat: polecat.name,
						rigPrefix,
						tmuxSocket,
						workspaceId: activeWorkspaceId,
						state: polecat.state,
					},
					{
						findExistingAttachTab: () => {
							const state = useTabsStore.getState();
							const match = state.tabs.find(
								(t) =>
									t.workspaceId === activeWorkspaceId &&
									(t.name === sessionName ||
										t.name.startsWith(`${sessionName} `)),
							);
							if (!match) return null;
							const paneIds = Object.keys(state.panes).filter(
								(id) => state.panes[id]?.tabId === match.id,
							);
							const paneId = paneIds[0];
							if (!paneId) return null;
							return { tabId: match.id, paneId };
						},
						activateTab: (tabId) => setActiveTab(activeWorkspaceId, tabId),
						addTab: (workspaceId) => addTab(workspaceId),
						setTabTitle: (tabId, title) => setTabAutoTitle(tabId, title),
						createOrAttach: (input) => createOrAttach.mutateAsync(input),
						writeToTerminal: (input) => writeToTerminal.mutateAsync(input),
					},
				);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to attach terminal";
				toast.error(message);
			}
		},
		[
			activeWorkspaceId,
			tmuxSocket,
			addTab,
			setTabAutoTitle,
			setActiveTab,
			createOrAttach,
			writeToTerminal,
		],
	);

	const attachDisabled = !activeWorkspaceId || !tmuxSocket;

	return (
		<div className="border-t border-border/60 px-2 py-2">
			<Collapsible open={open} onOpenChange={setOpen}>
				<div className="flex items-center justify-between gap-2 px-2 py-1">
					<CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
						{open ? (
							<HiChevronDown className="size-3" />
						) : (
							<HiChevronRight className="size-3" />
						)}
						<span>Gas Town</span>
						{polecats.length > 0 && (
							<span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
								{polecats.length}
							</span>
						)}
					</CollapsibleTrigger>
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						onClick={() => fleetQuery.refetch()}
						disabled={fleetQuery.isFetching}
						aria-label="Refresh Gas Town fleet"
					>
						<HiOutlineArrowPath
							className={`size-3.5 ${fleetQuery.isFetching ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
				<CollapsibleContent className="mt-1 space-y-2">
					{fleetQuery.error ? (
						<div className="px-2 text-xs text-destructive">
							Gas Town unavailable.
							<Button
								variant="link"
								size="sm"
								className="ml-1 h-auto p-0 text-xs"
								onClick={() => fleetQuery.refetch()}
							>
								Retry
							</Button>
						</div>
					) : fleetQuery.isLoading ? (
						<p className="px-2 text-xs text-muted-foreground">Loading fleet…</p>
					) : rigs.length === 0 ? (
						<p className="px-2 text-xs text-muted-foreground">
							No polecats yet. Sling work via New Workspace modal.
						</p>
					) : (
						rigs.map((rig) => (
							<RigGroup
								key={rig.name}
								rig={rig.name}
								polecats={rig.polecats}
								attachDisabled={attachDisabled}
								onAttach={handleAttach}
								onPeek={(p) => {
									setPeekTarget({ rig: p.rig, name: p.name, state: p.state });
									setDrawerOpen(true);
								}}
								onNudge={(p) => {
									setNudgeTarget({ rig: p.rig, name: p.name });
									setNudgeOpen(true);
								}}
								onNuke={(p) => {
									setNukeTarget({ rig: p.rig, name: p.name });
									setNukeOpen(true);
								}}
							/>
						))
					)}
				</CollapsibleContent>
			</Collapsible>
			<PolecatPeekDrawer
				target={peekTarget}
				open={drawerOpen}
				onOpenChange={(next) => {
					setDrawerOpen(next);
					if (!next) setPeekTarget(null);
				}}
			/>
			<NudgeDialog
				target={nudgeTarget}
				open={nudgeOpen}
				onOpenChange={(next) => {
					setNudgeOpen(next);
					if (!next) setNudgeTarget(null);
				}}
			/>
			<NukeConfirmDialog
				target={nukeTarget}
				open={nukeOpen}
				onOpenChange={(next) => {
					setNukeOpen(next);
					if (!next) setNukeTarget(null);
				}}
			/>
		</div>
	);
}

interface RigGroupProps {
	rig: string;
	polecats: Polecat[];
	attachDisabled: boolean;
	onAttach: (polecat: Polecat) => void;
	onPeek: (polecat: Polecat) => void;
	onNudge: (polecat: Polecat) => void;
	onNuke: (polecat: Polecat) => void;
}

function RigGroup({
	rig,
	polecats,
	attachDisabled,
	onAttach,
	onPeek,
	onNudge,
	onNuke,
}: RigGroupProps) {
	const [open, setOpen] = useState(true);
	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger className="flex w-full items-center gap-1 px-2 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground">
				{open ? (
					<HiChevronDown className="size-3" />
				) : (
					<HiChevronRight className="size-3" />
				)}
				<span className="truncate">{rig}</span>
				<span className="ml-auto text-[10px] text-muted-foreground">
					{polecats.length}
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-0.5 pl-3">
				{polecats.map((polecat) => (
					<PolecatRow
						key={`${polecat.rig}/${polecat.name}`}
						polecat={polecat}
						attachDisabled={attachDisabled}
						onAttach={() => onAttach(polecat)}
						onPeek={() => onPeek(polecat)}
						onNudge={() => onNudge(polecat)}
						onNuke={() => onNuke(polecat)}
					/>
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

interface RigGrouping {
	name: string;
	polecats: Polecat[];
}

function groupByRig(polecats: Polecat[]): RigGrouping[] {
	const byRig = new Map<string, Polecat[]>();
	for (const polecat of polecats) {
		const existing = byRig.get(polecat.rig);
		if (existing) {
			existing.push(polecat);
		} else {
			byRig.set(polecat.rig, [polecat]);
		}
	}
	return Array.from(byRig.entries())
		.map(([name, list]) => ({
			name,
			polecats: [...list].sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
