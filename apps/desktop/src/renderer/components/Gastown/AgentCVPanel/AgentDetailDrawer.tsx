import type { AgentDetail, AgentKind } from "@spectralset/gastown-cli-client";
import { Button } from "@spectralset/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@spectralset/ui/sheet";
import { toast } from "@spectralset/ui/sonner";
import { cn } from "@spectralset/ui/utils";
import { useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";
import {
	HiOutlineChevronDown,
	HiOutlineChevronRight,
	HiOutlineClipboard,
	HiOutlineCommandLine,
} from "react-icons/hi2";
import { useCreateOrAttachWithTheme } from "renderer/hooks/useCreateOrAttachWithTheme";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { attachToAgent, buildTmuxSessionName } from "renderer/lib/gastown";
import { getRigPrefix } from "renderer/lib/gastown/rig-prefix";
import { useTabsStore } from "renderer/stores/tabs/store";
import { STATE_BADGE_CLASS } from "./AgentCVPanel";

export interface AgentSelection {
	kind: AgentKind;
	rig: string | undefined;
	name: string;
}

interface AgentDetailDrawerProps {
	selected: AgentSelection | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AgentDetailDrawer({
	selected,
	open,
	onOpenChange,
}: AgentDetailDrawerProps) {
	const detailQuery = electronTrpc.gastown.agents.get.useQuery(
		selected ?? { kind: "mayor", name: "mayor" },
		{
			enabled: !!selected,
			refetchInterval: 5000,
			refetchOnWindowFocus: false,
		},
	);
	const detail = detailQuery.data ?? null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-xl">
				<SheetHeader className="border-b pb-3">
					<SheetTitle className="font-mono text-sm">
						{selected
							? `${selected.rig ? `${selected.rig}/` : ""}${selected.name}`
							: "agent"}
					</SheetTitle>
					<SheetDescription className="text-xs">
						Live agent detail · auto-refresh every 5s
					</SheetDescription>
				</SheetHeader>
				<div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
					{detailQuery.error ? (
						<p className="text-xs text-destructive">
							Failed to load agent: {detailQuery.error.message}
						</p>
					) : detailQuery.isLoading && !detail ? (
						<p className="text-xs text-muted-foreground">Loading…</p>
					) : !detail ? (
						<p className="text-xs text-muted-foreground">
							No detail available.
						</p>
					) : (
						<AgentDetailBody detail={detail} />
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function AgentDetailBody({ detail }: { detail: AgentDetail }) {
	const [rawOpen, setRawOpen] = useState(false);
	const showLastCompletion = detail.exitType || detail.completionTime;
	const showRecentHistory = detail.recentCompletions.length > 0;

	return (
		<div className="flex flex-col gap-4">
			<section>
				<div className="flex items-center gap-2">
					<h2 className="truncate text-base font-semibold">{detail.name}</h2>
					<span
						className={cn(
							"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
							STATE_BADGE_CLASS[detail.state],
						)}
					>
						{detail.state}
					</span>
				</div>
				<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
					<span>
						kind{" "}
						<span className="font-medium text-foreground">{detail.kind}</span>
					</span>
					<span>
						role{" "}
						<span className="font-medium text-foreground">{detail.role}</span>
					</span>
					<span className="font-mono">{detail.address}</span>
					<span className="font-mono">{detail.session}</span>
				</div>
			</section>

			<section>
				<SectionTitle>Current work</SectionTitle>
				<KVGrid
					rows={[
						["hook bead", detail.hookBead],
						["active MR", detail.activeMr],
						["branch", detail.branch, "mono"],
						["cleanup", detail.cleanupStatus],
					]}
				/>
			</section>

			{showLastCompletion && (
				<section>
					<SectionTitle>Last completion</SectionTitle>
					<KVGrid
						rows={[
							["exit type", detail.exitType],
							[
								"completed",
								detail.completionTime
									? safeRelativeTime(detail.completionTime)
									: null,
							],
						]}
					/>
				</section>
			)}

			{showRecentHistory && (
				<section>
					<SectionTitle>Recent history</SectionTitle>
					<div className="overflow-hidden rounded border border-border/60">
						<table className="w-full text-xs">
							<thead className="bg-muted/40 text-[11px] text-muted-foreground">
								<tr>
									<th className="px-2 py-1 text-left font-medium">Bead</th>
									<th className="px-2 py-1 text-left font-medium">Title</th>
									<th className="px-2 py-1 text-left font-medium">Closed</th>
								</tr>
							</thead>
							<tbody>
								{detail.recentCompletions.map((c) => (
									<tr key={c.beadId} className="border-t border-border/40">
										<td className="px-2 py-1 font-mono text-[11px]">
											{c.beadId}
										</td>
										<td className="max-w-[260px] truncate px-2 py-1">
											{c.title}
										</td>
										<td className="px-2 py-1 text-[11px] text-muted-foreground">
											{c.closedAt ? safeRelativeTime(c.closedAt) : "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			<section>
				<button
					type="button"
					onClick={() => setRawOpen((v) => !v)}
					aria-expanded={rawOpen}
					className="flex w-full items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
				>
					{rawOpen ? (
						<HiOutlineChevronDown className="size-3" />
					) : (
						<HiOutlineChevronRight className="size-3" />
					)}
					Raw metadata
				</button>
				{rawOpen && (
					<div className="mt-2">
						<KVGrid
							rows={[
								["agentBeadId", detail.agentBeadId],
								["exitType", detail.exitType],
								["cleanupStatus", detail.cleanupStatus],
								["running", String(detail.running)],
								["unreadMail", String(detail.unreadMail)],
								["firstSubject", detail.firstSubject ?? null],
							]}
						/>
					</div>
				)}
			</section>

			<ActionsRow detail={detail} />
		</div>
	);
}

function ActionsRow({ detail }: { detail: AgentDetail }) {
	const { workspaceId } = useParams({ strict: false }) as {
		workspaceId?: string;
	};
	const probeQuery = electronTrpc.gastown.probe.useQuery(undefined, {
		refetchOnWindowFocus: false,
	});
	const tmuxSocket = probeQuery.data?.tmuxSocket ?? null;
	const addTab = useTabsStore((s) => s.addTab);
	const setTabAutoTitle = useTabsStore((s) => s.setTabAutoTitle);
	const setActiveTab = useTabsStore((s) => s.setActiveTab);
	const createOrAttach = useCreateOrAttachWithTheme();
	const writeToTerminal = electronTrpc.terminal.write.useMutation();

	const onCopySession = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(detail.session);
			toast.success(`Copied ${detail.session}`);
		} catch {
			toast.error("Copy failed");
		}
	}, [detail.session]);

	const onOpenTerminal = useCallback(async () => {
		if (!detail.rig) {
			toast.error("Top-level agents have no tmux session to attach to.");
			return;
		}
		if (!workspaceId) {
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
		const rigPrefix = getRigPrefix(detail.rig);
		const sessionName = buildTmuxSessionName(
			rigPrefix,
			detail.kind,
			detail.name,
		);
		try {
			await attachToAgent(
				{
					rig: detail.rig,
					polecat: detail.name,
					kind: detail.kind,
					rigPrefix,
					tmuxSocket,
					workspaceId,
					state: detail.state,
				},
				{
					findExistingAttachTab: () => {
						const state = useTabsStore.getState();
						const match = state.tabs.find(
							(t) =>
								t.workspaceId === workspaceId &&
								(t.name === sessionName ||
									t.name.startsWith(`${sessionName} `)),
						);
						if (!match) return null;
						const paneId = Object.keys(state.panes).find(
							(id) => state.panes[id]?.tabId === match.id,
						);
						return paneId ? { tabId: match.id, paneId } : null;
					},
					activateTab: (tabId) => setActiveTab(workspaceId, tabId),
					addTab: (wsId) => addTab(wsId),
					setTabTitle: (tabId, title) => setTabAutoTitle(tabId, title),
					createOrAttach: (input) => createOrAttach.mutateAsync(input),
					writeToTerminal: (input) => writeToTerminal.mutateAsync(input),
				},
			);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to attach terminal",
			);
		}
	}, [
		detail,
		workspaceId,
		tmuxSocket,
		addTab,
		setTabAutoTitle,
		setActiveTab,
		createOrAttach,
		writeToTerminal,
	]);

	return (
		<section className="flex items-center gap-2 border-t border-border/60 pt-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-7 gap-1.5 text-xs"
				onClick={onCopySession}
			>
				<HiOutlineClipboard className="size-3.5" />
				Copy session
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-7 gap-1.5 text-xs"
				onClick={onOpenTerminal}
			>
				<HiOutlineCommandLine className="size-3.5" />
				Open in terminal
			</Button>
		</section>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
			{children}
		</h3>
	);
}

type KVRow = [label: string, value: string | null, style?: "mono"];

function KVGrid({ rows }: { rows: KVRow[] }) {
	return (
		<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
			{rows.map(([label, value, style]) => (
				<span key={label} className="contents">
					<span className="text-[11px] text-muted-foreground">{label}</span>
					<span
						className={cn(
							"truncate text-foreground",
							style === "mono" && "font-mono text-[11px]",
							value == null && "text-muted-foreground/60",
						)}
					>
						{value ?? "—"}
					</span>
				</span>
			))}
		</div>
	);
}

function safeRelativeTime(value: string): string {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return formatDistanceToNow(d, { addSuffix: true });
}
