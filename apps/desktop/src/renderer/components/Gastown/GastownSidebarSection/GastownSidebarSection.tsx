import type { RigAgent } from "@spectralset/gastown-cli-client";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@spectralset/ui/collapsible";
import { toast } from "@spectralset/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { HiChevronDown, HiChevronRight } from "react-icons/hi2";
import { AgentRow } from "renderer/components/Gastown/AgentRow";
import { useCreateOrAttachWithTheme } from "renderer/hooks/useCreateOrAttachWithTheme";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { attachToAgent, buildTmuxSessionName } from "renderer/lib/gastown";
import { getRigPrefix } from "renderer/lib/gastown/rig-prefix";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useTabsStore } from "renderer/stores/tabs/store";

// Shares the key with GastownCard so toggle + sidebar read the same cache.
const ENABLED_QUERY_KEY = ["electron", "settings", "gastownEnabled"] as const;
const PROBE_QUERY_KEY = ["electron", "gastown", "probe"] as const;

const ROLE_ORDER: Record<RigAgent["role"], number> = {
	mayor: 0,
	refinery: 1,
	witness: 2,
	crew: 3,
	polecat: 4,
};

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

	const probeQuery = useQuery({
		queryKey: PROBE_QUERY_KEY,
		queryFn: () => electronTrpcClient.gastown.probe.query(),
		refetchInterval: 5000,
		refetchOnWindowFocus: false,
	});

	const rigs = useMemo(() => {
		const data = probeQuery.data?.rigs ?? [];
		return data.map((rig) => ({
			name: rig.name,
			agents: sortAgents(rig.agents),
		}));
	}, [probeQuery.data]);

	const totalAgents = useMemo(
		() => rigs.reduce((sum, rig) => sum + rig.agents.length, 0),
		[rigs],
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

	const onAttach = useCallback(
		async (agent: RigAgent) => {
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
			const rigPrefix = getRigPrefix(agent.rig);
			const sessionName = buildTmuxSessionName(rigPrefix, agent.name);
			try {
				await attachToAgent(
					{
						rig: agent.rig,
						polecat: agent.name,
						rigPrefix,
						tmuxSocket,
						workspaceId: activeWorkspaceId,
						state: agent.state ?? undefined,
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
						{totalAgents > 0 && (
							<span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
								{totalAgents}
							</span>
						)}
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent className="mt-1 space-y-2">
					{probeQuery.error ? (
						<div className="px-2 text-xs text-destructive">
							Gas Town unavailable.
						</div>
					) : probeQuery.isLoading ? (
						<p className="px-2 text-xs text-muted-foreground">
							Loading roster…
						</p>
					) : rigs.length === 0 ? (
						<p className="px-2 text-xs text-muted-foreground">
							No rigs yet. Initialize Gas Town to begin.
						</p>
					) : (
						rigs.map((rig) => (
							<RigGroup
								key={rig.name}
								rig={rig.name}
								agents={rig.agents}
								onAttach={onAttach}
							/>
						))
					)}
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

interface RigGroupProps {
	rig: string;
	agents: RigAgent[];
	onAttach: (agent: RigAgent) => void;
}

function RigGroup({ rig, agents, onAttach }: RigGroupProps) {
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
					{agents.length}
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-0.5 pl-3">
				{agents.length === 0 ? (
					<p className="px-2 py-1 text-[11px] text-muted-foreground">
						No agents.
					</p>
				) : (
					agents.map((agent) => (
						<AgentRow
							key={`${agent.rig}/${agent.role}/${agent.name}`}
							agent={agent}
							onAttach={onAttach}
						/>
					))
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}

function sortAgents(agents: RigAgent[]): RigAgent[] {
	return [...agents].sort((a, b) => {
		const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
		if (roleDiff !== 0) return roleDiff;
		const aWorking = a.state === "working" ? 0 : 1;
		const bWorking = b.state === "working" ? 0 : 1;
		if (aWorking !== bWorking) return aWorking - bWorking;
		return a.name.localeCompare(b.name);
	});
}
