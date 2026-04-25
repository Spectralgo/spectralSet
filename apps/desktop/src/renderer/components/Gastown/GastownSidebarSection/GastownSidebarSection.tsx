import type { RigAgent } from "@spectralset/gastown-cli-client";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@spectralset/ui/collapsible";
import { toast } from "@spectralset/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiChevronDown,
	HiChevronRight,
	HiOutlineEnvelope,
	HiOutlineSun,
	HiOutlineTruck,
	HiOutlineUserGroup,
} from "react-icons/hi2";
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

	// Auto-upsert the Gas Town project + Mayor preset once per unique
	// townRoot seen from a successful probe. Guarded by a ref so the
	// 5s probe refetch doesn't re-fire the mutation. See bead ss-4ho.
	const ensuredTownRootRef = useRef<string | null>(null);
	useEffect(() => {
		const probe = probeQuery.data;
		if (!probe?.installed) return;
		const townRoot = probe.townRoot;
		if (!townRoot) return;
		if (ensuredTownRootRef.current === townRoot) return;
		ensuredTownRootRef.current = townRoot;
		void electronTrpcClient.gastown.ensureProject.mutate({
			townRoot,
			townName: probe.townName,
			tmuxSocket: probe.tmuxSocket,
		});
	}, [probeQuery.data]);

	const { workspaceId: activeWorkspaceId } = useParams({ strict: false }) as {
		workspaceId?: string;
	};
	const addTab = useTabsStore((s) => s.addTab);
	const setTabAutoTitle = useTabsStore((s) => s.setTabAutoTitle);
	const setActiveTab = useTabsStore((s) => s.setActiveTab);
	const addGastownPane = useTabsStore((s) => s.addGastownPane);
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
			const sessionName = buildTmuxSessionName(
				rigPrefix,
				agent.role,
				agent.name,
			);
			try {
				await attachToAgent(
					{
						rig: agent.rig,
						polecat: agent.name,
						kind: agent.role,
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
		<div className="flex h-full min-h-0 flex-col px-2 py-2">
			<Collapsible
				open={open}
				onOpenChange={setOpen}
				className="flex min-h-0 flex-1 flex-col"
			>
				<div className="flex flex-shrink-0 items-center justify-between gap-2 px-2 py-1">
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
				<CollapsibleContent className="mt-1 flex min-h-0 flex-1 flex-col">
					<div className="flex-shrink-0 space-y-2">
						<button
							type="button"
							onClick={() => {
								if (!activeWorkspaceId) return;
								addGastownPane(activeWorkspaceId, { kind: "gastown-today" });
							}}
							className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							aria-label="Open Today"
						>
							<HiOutlineSun className="size-3 shrink-0 text-muted-foreground" />
							<span className="flex-1 truncate">Today</span>
							{/* Count badge placeholder — wired in C1-today-02 (gastown.today router). */}
							<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
								—
							</span>
						</button>
						<button
							type="button"
							onClick={() => {
								if (!activeWorkspaceId) {
									toast("Open a workspace first");
									return;
								}
								addGastownPane(activeWorkspaceId, { kind: "gastown-mail" });
							}}
							className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							aria-label="Open Gas Town Mail"
						>
							<HiOutlineEnvelope className="size-3 shrink-0 text-muted-foreground" />
							<span className="truncate">Mail</span>
						</button>
						<button
							type="button"
							onClick={() => {
								if (!activeWorkspaceId) {
									toast("Open a workspace first");
									return;
								}
								addGastownPane(activeWorkspaceId, { kind: "gastown-convoys" });
							}}
							className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							aria-label="Open Gas Town Convoys"
						>
							<HiOutlineTruck className="size-3 shrink-0 text-muted-foreground" />
							<span className="truncate">Convoys</span>
						</button>
						<button
							type="button"
							onClick={() => {
								if (!activeWorkspaceId) {
									toast("Open a workspace first");
									return;
								}
								addGastownPane(activeWorkspaceId, { kind: "gastown-agents" });
							}}
							className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							aria-label="Open Gas Town Agents"
						>
							<HiOutlineUserGroup className="size-3 shrink-0 text-muted-foreground" />
							<span className="truncate">Agents</span>
						</button>
					</div>
					{probeQuery.error ? (
						<div className="mt-2 flex-shrink-0 px-2 text-xs text-destructive">
							Gas Town unavailable.
						</div>
					) : probeQuery.isLoading ? (
						<p className="mt-2 flex-shrink-0 px-2 text-xs text-muted-foreground">
							Loading roster…
						</p>
					) : rigs.length === 0 ? (
						<p className="mt-2 flex-shrink-0 px-2 text-xs text-muted-foreground">
							No rigs yet. Initialize Gas Town to begin.
						</p>
					) : (
						<div className="hide-scrollbar mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
							{rigs.map((rig) => (
								<RigGroup
									key={rig.name}
									rig={rig.name}
									agents={rig.agents}
									onAttach={onAttach}
								/>
							))}
						</div>
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
	const workingAgents = useMemo(
		() => agents.filter((a) => a.state === "working"),
		[agents],
	);
	const otherAgents = useMemo(
		() => agents.filter((a) => a.state !== "working"),
		[agents],
	);
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
					<>
						{workingAgents.length > 0 && (
							<p className="px-2 pt-1 text-[10px] text-muted-foreground">
								Working ({workingAgents.length})
							</p>
						)}
						{workingAgents.map((agent) => (
							<AgentRow
								key={`${agent.rig}/${agent.role}/${agent.name}`}
								agent={agent}
								onAttach={onAttach}
							/>
						))}
						{otherAgents.map((agent) => (
							<AgentRow
								key={`${agent.rig}/${agent.role}/${agent.name}`}
								agent={agent}
								onAttach={onAttach}
							/>
						))}
					</>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}

function sortAgents(agents: RigAgent[]): RigAgent[] {
	return [...agents].sort((a, b) => {
		const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
		if (roleDiff !== 0) return roleDiff;
		return a.name.localeCompare(b.name);
	});
}
