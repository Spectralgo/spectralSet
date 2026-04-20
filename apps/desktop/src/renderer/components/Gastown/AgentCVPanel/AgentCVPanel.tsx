import type {
	AgentKind,
	AgentState,
	AgentSummary,
} from "@spectralset/gastown-cli-client";
import { cn } from "@spectralset/ui/utils";
import { useMemo, useState } from "react";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { AgentDetailDrawer, type AgentSelection } from "./AgentDetailDrawer";

const KIND_EMOJI: Record<AgentKind, string> = {
	mayor: "🏛",
	deacon: "🩺",
	boot: "⚙️",
	polecat: "🦨",
	refinery: "🛠",
	witness: "👁",
	crew: "🧑‍🔧",
};

export const STATE_BADGE_CLASS: Record<AgentState, string> = {
	idle: "bg-muted text-muted-foreground",
	working: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	stalled: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	zombie: "bg-red-500/15 text-red-600 dark:text-red-400",
	done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
	nuked: "bg-muted text-muted-foreground line-through",
};

const TOP_LEVEL_ORDER: AgentKind[] = ["mayor", "deacon", "boot"];
const RIG_ROLE_ORDER: AgentKind[] = ["refinery", "witness", "crew", "polecat"];

interface Group {
	title: string;
	agents: AgentSummary[];
}

function groupAgents(agents: AgentSummary[]): Group[] {
	const topLevel: Record<string, AgentSummary[]> = {};
	for (const kind of TOP_LEVEL_ORDER) topLevel[kind] = [];
	const byRig = new Map<string, AgentSummary[]>();

	for (const agent of agents) {
		if (TOP_LEVEL_ORDER.includes(agent.kind)) {
			topLevel[agent.kind]?.push(agent);
			continue;
		}
		const rig = agent.rig ?? "(unassigned)";
		const bucket = byRig.get(rig) ?? [];
		bucket.push(agent);
		byRig.set(rig, bucket);
	}

	const groups: Group[] = [];
	for (const kind of TOP_LEVEL_ORDER) {
		const bucket = topLevel[kind] ?? [];
		if (bucket.length > 0) {
			groups.push({
				title: titleCase(kind),
				agents: bucket.sort((a, b) => a.name.localeCompare(b.name)),
			});
		}
	}

	const rigNames = [...byRig.keys()].sort();
	for (const rig of rigNames) {
		const bucket = byRig.get(rig) ?? [];
		groups.push({
			title: rig,
			agents: bucket.sort(compareRigAgents),
		});
	}

	return groups;
}

function compareRigAgents(a: AgentSummary, b: AgentSummary): number {
	const aIdx = RIG_ROLE_ORDER.indexOf(a.kind);
	const bIdx = RIG_ROLE_ORDER.indexOf(b.kind);
	if (aIdx !== bIdx) return aIdx - bIdx;
	if (a.state === "working" && b.state !== "working") return -1;
	if (b.state === "working" && a.state !== "working") return 1;
	return a.name.localeCompare(b.name);
}

function titleCase(v: string): string {
	return v.charAt(0).toUpperCase() + v.slice(1);
}

export function AgentCVPanel() {
	// The `agents` tRPC subrouter — unlike the parent gastown router — has no
	// cached-probe fallback for townPath. Thread it from the renderer: the
	// user override (localStorage) wins, else the probe-detected townRoot.
	const townPathOverride = useGastownTownPath();
	const probeQuery = electronTrpc.gastown.probe.useQuery(undefined, {
		refetchOnWindowFocus: false,
	});
	const townPath = townPathOverride || probeQuery.data?.townRoot || undefined;
	const listQuery = electronTrpc.gastown.agents.list.useQuery(
		townPath ? { townPath } : undefined,
		{
			refetchInterval: 5000,
			refetchOnWindowFocus: false,
		},
	);
	const [selected, setSelected] = useState<AgentSelection | null>(null);

	const agents = listQuery.data ?? [];
	const groups = useMemo(() => groupAgents(agents), [agents]);

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
				<HiOutlineUserGroup className="size-5 text-muted-foreground" />
				<h1 className="text-sm font-medium">Agents</h1>
				<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
					{agents.length}
				</span>
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				{listQuery.error ? (
					<div className="text-xs text-destructive">
						Failed to load agents. Is Gas Town running?
					</div>
				) : listQuery.isLoading && agents.length === 0 ? (
					<div className="text-xs text-muted-foreground">Loading…</div>
				) : groups.length === 0 ? (
					<div className="text-xs text-muted-foreground">No agents.</div>
				) : (
					<div className="flex flex-col gap-6">
						{groups.map((group) => (
							<GroupSection
								key={group.title}
								group={group}
								onSelect={setSelected}
							/>
						))}
					</div>
				)}
			</div>
			<AgentDetailDrawer
				selected={selected}
				open={selected !== null}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
			/>
		</div>
	);
}

interface GroupSectionProps {
	group: Group;
	onSelect: (selection: AgentSelection) => void;
}

function GroupSection({ group, onSelect }: GroupSectionProps) {
	return (
		<section>
			<h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{group.title}
			</h2>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
				{group.agents.map((agent) => (
					<AgentCard
						key={agent.address}
						agent={agent}
						onSelect={() =>
							onSelect({
								kind: agent.kind,
								rig: agent.rig ?? undefined,
								name: agent.name,
							})
						}
					/>
				))}
			</div>
		</section>
	);
}

interface AgentCardProps {
	agent: AgentSummary;
	onSelect: () => void;
}

function AgentCard({ agent, onSelect }: AgentCardProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"flex flex-col gap-2 rounded-md border border-border/60 bg-background px-3 py-2.5 text-left transition-colors",
				"hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
			)}
		>
			<div className="flex items-start gap-2">
				<span
					aria-label={agent.kind}
					className="text-base leading-none"
					role="img"
				>
					{KIND_EMOJI[agent.kind]}
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-xs font-medium">{agent.name}</span>
						{agent.rig && (
							<span className="shrink-0 font-mono text-[10px] text-muted-foreground">
								{agent.rig}
							</span>
						)}
					</div>
					<div className="truncate text-[11px] text-muted-foreground">
						{agent.role}
					</div>
				</div>
				{agent.unreadMail > 0 && (
					<span
						title={`${agent.unreadMail} unread mail`}
						className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
					>
						{agent.unreadMail}
					</span>
				)}
			</div>
			<div className="flex items-center gap-2">
				<span
					className={cn(
						"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
						STATE_BADGE_CLASS[agent.state],
					)}
				>
					{agent.state}
				</span>
				<span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
					{agent.session}
				</span>
			</div>
		</button>
	);
}
