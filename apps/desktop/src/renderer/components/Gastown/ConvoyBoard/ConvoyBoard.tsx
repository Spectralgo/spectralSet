import type { Convoy, ConvoyTracked } from "@spectralset/gastown-cli-client";
import { Button } from "@spectralset/ui/button";
import { Progress } from "@spectralset/ui/progress";
import { toast } from "@spectralset/ui/sonner";
import { Switch } from "@spectralset/ui/switch";
import { cn } from "@spectralset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import {
	HiOutlineArrowPath,
	HiOutlineArrowTopRightOnSquare,
	HiOutlineClipboard,
	HiOutlineClipboardDocumentList,
	HiOutlineSquares2X2,
} from "react-icons/hi2";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpc } from "renderer/lib/electron-trpc";

const STATUS_CLASS: Record<string, string> = {
	open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
	in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	closed: "bg-muted text-muted-foreground",
	blocked: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const ISSUE_STATUS_ORDER = [
	"open",
	"in_progress",
	"hooked",
	"blocked",
	"closed",
] as const;

function displayText(
	value: string | null | undefined,
	fallback: string,
): string {
	const trimmed = value?.trim();
	return trimmed ? trimmed : fallback;
}

function normalizeStatus(status: string | null | undefined): string {
	return displayText(status, "uncategorized");
}

function statusClass(status: string | null | undefined): string {
	return (
		STATUS_CLASS[normalizeStatus(status)] ?? "bg-muted text-muted-foreground"
	);
}

function statusLabel(status: string | null | undefined): string {
	const normalized = normalizeStatus(status);
	if (normalized === "closed") return "Done";
	if (normalized === "in_progress") return "In progress";
	if (normalized === "uncategorized") return "Uncategorized";
	return normalized
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function progressCounts(c: Pick<Convoy, "completed" | "total" | "tracked">): {
	completed: number;
	total: number;
} {
	const total = c.total ?? c.tracked.length;
	const fromTracked = c.tracked.filter(
		(t) => normalizeStatus(t.status) === "closed",
	).length;
	const completed = c.completed != null ? c.completed : fromTracked;
	return { completed, total };
}

function safeRelativeTime(value: string | undefined): string {
	if (!value) return "date unavailable";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return formatDistanceToNow(d, { addSuffix: true });
}

function progressPercent(completed: number, total: number): number {
	return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export function ConvoyBoard() {
	const [showAll, setShowAll] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const townPath = useGastownTownPath() || undefined;

	const listQuery = electronTrpc.gastown.convoys.list.useQuery(
		{ all: showAll, townPath },
		{ refetchInterval: 10_000, refetchOnWindowFocus: false },
	);

	const convoys = listQuery.data ?? [];
	const resolvedSelectedId = useMemo(
		() =>
			convoys.find((c) => c.id === selectedId)?.id ?? convoys[0]?.id ?? null,
		[convoys, selectedId],
	);
	const isRefreshing = Boolean(listQuery.isFetching && !listQuery.isLoading);

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
				<HiOutlineClipboardDocumentList className="size-5 text-muted-foreground" />
				<div>
					<h1 className="text-sm font-medium">Sprints</h1>
					<p className="text-[11px] text-muted-foreground">
						Sprint planning for tracked issues.
					</p>
				</div>
				<div className="ml-auto flex items-center gap-3">
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={() => {
							void listQuery.refetch();
						}}
						disabled={listQuery.isLoading}
					>
						<HiOutlineArrowPath
							className={cn("size-3.5", isRefreshing && "animate-spin")}
						/>
						{isRefreshing ? "Refreshing" : "Refresh"}
					</Button>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<label htmlFor="convoy-show-closed" className="cursor-pointer">
							Show completed
						</label>
						<Switch
							id="convoy-show-closed"
							checked={showAll}
							onCheckedChange={(next) => {
								setShowAll(next);
								setSelectedId(null);
							}}
							aria-label="Show completed sprints"
						/>
					</div>
				</div>
			</header>
			<div className="flex min-h-0 flex-1">
				<ConvoyList
					convoys={convoys}
					isLoading={listQuery.isLoading}
					isError={!!listQuery.error}
					showAll={showAll}
					selectedId={resolvedSelectedId}
					onSelect={setSelectedId}
				/>
				<ConvoyDetail id={resolvedSelectedId} />
			</div>
		</div>
	);
}

interface ConvoyListProps {
	convoys: Convoy[];
	isLoading: boolean;
	isError: boolean;
	showAll: boolean;
	selectedId: string | null;
	onSelect: (id: string) => void;
}

function ConvoyList({
	convoys,
	isLoading,
	isError,
	showAll,
	selectedId,
	onSelect,
}: ConvoyListProps) {
	const sprintScope = showAll ? "total" : "active";
	const countLabel = `${convoys.length} ${sprintScope} sprint${
		convoys.length === 1 ? "" : "s"
	} found`;
	const body = isError ? (
		<div className="p-4 text-xs text-destructive">
			Failed to load sprints. Is Gas Town running?
		</div>
	) : isLoading ? (
		<div className="p-4 text-xs text-muted-foreground">Loading sprints…</div>
	) : convoys.length === 0 ? (
		<div className="space-y-1 p-4 text-xs text-muted-foreground">
			<div>No {sprintScope} sprints found.</div>
			<div>Refresh after creating a convoy in Gas Town.</div>
		</div>
	) : (
		convoys.map((c) => {
			const { completed, total } = progressCounts(c);
			const percent = progressPercent(completed, total);
			const selected = c.id === selectedId;
			return (
				<button
					key={c.id}
					type="button"
					onClick={() => onSelect(c.id)}
					aria-current={selected ? "true" : undefined}
					className={cn(
						"flex flex-col gap-2 border-b border-border/40 px-3 py-3 text-left text-xs transition-colors",
						"hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
						selected && "bg-accent",
					)}
				>
					<div className="flex items-start gap-2">
						<span
							className={cn(
								"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
								statusClass(c.status),
							)}
						>
							{statusLabel(c.status)}
						</span>
						<span className="min-w-0 flex-1 truncate font-medium">
							{c.title}
						</span>
					</div>
					<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
						<span className="font-mono">{c.id}</span>
						<span className="ml-auto shrink-0">
							{total} issue{total === 1 ? "" : "s"}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Progress value={percent} className="h-1 flex-1" />
						<span className="font-mono text-[11px] text-muted-foreground">
							{completed}/{total}
						</span>
					</div>
					<div className="flex items-center text-[11px] text-muted-foreground">
						<span className="ml-auto shrink-0">
							{safeRelativeTime(c.created_at)}
						</span>
					</div>
				</button>
			);
		})
	);
	return (
		<div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-muted/10">
			<div className="border-b border-border/40 px-3 py-2">
				<div className="text-[11px] font-medium uppercase text-muted-foreground">
					Sprint backlog
				</div>
				{!isLoading && !isError ? (
					<div className="mt-0.5 text-[11px] text-muted-foreground">
						{countLabel}
					</div>
				) : null}
			</div>
			{body}
		</div>
	);
}

interface ConvoyDetailProps {
	id: string | null;
}

function ConvoyDetail({ id }: ConvoyDetailProps) {
	const navigate = useNavigate();
	const statusQuery = electronTrpc.gastown.convoys.status.useQuery(
		{ id: id ?? "" },
		{ enabled: !!id, refetchInterval: 10_000, refetchOnWindowFocus: false },
	);

	if (!id) {
		return (
			<div className="flex flex-1 items-center justify-center p-8 text-xs text-muted-foreground">
				Select a sprint to inspect.
			</div>
		);
	}
	if (statusQuery.isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center p-8 text-xs text-muted-foreground">
				Loading sprint…
			</div>
		);
	}
	const convoy = statusQuery.data;
	if (!convoy) {
		return (
			<div className="flex flex-1 items-center justify-center p-8 text-xs text-destructive">
				Sprint not found.
			</div>
		);
	}

	const { completed, total } = progressCounts(convoy);
	const percent = progressPercent(completed, total);
	const remaining = Math.max(0, total - completed);
	const openIssueBoard = () => {
		void navigate({
			to: "/convoys/$convoyId/board",
			params: { convoyId: convoy.id },
			search: { mode: "kanban" },
		});
	};

	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<div className="border-b border-border/60 px-5 py-4">
				<div className="mb-2 flex items-center gap-2">
					<span className="text-[11px] font-medium uppercase text-muted-foreground">
						Sprint summary
					</span>
					<span
						className={cn(
							"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
							statusClass(convoy.status),
						)}
					>
						{statusLabel(convoy.status)}
					</span>
					<Button
						type="button"
						variant="outline"
						size="xs"
						className="ml-auto"
						onClick={openIssueBoard}
					>
						<HiOutlineArrowTopRightOnSquare className="size-3.5" />
						Open issue board
					</Button>
				</div>
				<h2 className="truncate text-base font-semibold">{convoy.title}</h2>
				<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
					<span className="font-mono">{convoy.id}</span>
					<span>{safeRelativeTime(convoy.created_at)}</span>
					<span>
						{total} tracked issue reference{total === 1 ? "" : "s"}
					</span>
				</div>
				<div className="mt-4 flex items-center gap-3">
					<Progress value={percent} className="h-1.5 flex-1" />
					<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
						{completed}/{total}
					</span>
				</div>
				<div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border/60 bg-border/60">
					<Metric label="Issues" value={String(total)} />
					<Metric label="Done" value={String(completed)} />
					<Metric label="Remaining" value={String(remaining)} />
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<IssueBoard issues={convoy.tracked} />
				<IssueTable issues={convoy.tracked} />
			</div>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-background px-3 py-2">
			<div className="text-[11px] text-muted-foreground">{label}</div>
			<div className="mt-1 font-mono text-sm font-medium">{value}</div>
		</div>
	);
}

function issueColumns(issues: ConvoyTracked[]) {
	const grouped = new Map<string, ConvoyTracked[]>();
	for (const status of ISSUE_STATUS_ORDER) grouped.set(status, []);
	for (const issue of issues) {
		const status = normalizeStatus(issue.status);
		const bucket = grouped.get(status);
		if (bucket) bucket.push(issue);
		else grouped.set(status, [issue]);
	}
	return [...grouped.entries()].filter(
		([status, bucket]) =>
			bucket.length > 0 || status === "open" || status === "closed",
	);
}

function IssueBoard({ issues }: { issues: ConvoyTracked[] }) {
	if (issues.length === 0) {
		return (
			<div className="p-4 text-xs text-muted-foreground">No issues yet.</div>
		);
	}
	return (
		<section className="border-b border-border/60 px-5 py-4">
			<div className="mb-3 flex items-center gap-2">
				<HiOutlineSquares2X2 className="size-4 text-muted-foreground" />
				<h3 className="text-xs font-medium">Issues</h3>
			</div>
			<div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2">
				{issueColumns(issues).map(([status, bucket]) => (
					<div
						key={status}
						className="min-h-28 rounded-md border border-border/60 bg-muted/15"
					>
						<div className="flex items-center justify-between border-b border-border/50 px-2.5 py-2">
							<span className="text-[11px] font-medium">
								{statusLabel(status)}
							</span>
							<span className="font-mono text-[11px] text-muted-foreground">
								{bucket.length}
							</span>
						</div>
						<div className="flex flex-col gap-1.5 p-2">
							{bucket.length === 0 ? (
								<div className="px-1 py-4 text-center text-[11px] text-muted-foreground">
									No issues
								</div>
							) : (
								bucket.map((issue) => (
									<IssueCard key={issue.id} issue={issue} />
								))
							)}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function IssueCard({ issue }: { issue: ConvoyTracked }) {
	return (
		<div className="rounded-md border border-border/50 bg-background px-2.5 py-2">
			<div className="flex items-center gap-2">
				<span className="font-mono text-[10px] text-muted-foreground">
					{issue.id}
				</span>
				<span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
					{displayText(issue.issue_type, "Unknown type")}
				</span>
			</div>
			<p className="mt-1 line-clamp-2 text-xs leading-snug">
				{displayText(issue.title, "Issue details unavailable")}
			</p>
			<div className="mt-2 text-[10px] text-muted-foreground">
				{displayText(issue.dependency_type, "tracks")}
			</div>
		</div>
	);
}

function IssueTable({ issues }: { issues: ConvoyTracked[] }) {
	if (issues.length === 0) return null;
	const onCopy = async (id: string) => {
		try {
			await navigator.clipboard.writeText(id);
			toast.success(`Copied ${id}`);
		} catch {
			toast.error("Copy failed");
		}
	};
	return (
		<section className="px-5 py-4">
			<div className="mb-2 text-xs font-medium">Issue table</div>
			<table className="w-full text-xs">
				<thead className="text-[11px] text-muted-foreground">
					<tr className="border-b border-border/60">
						<th className="px-3 py-2 text-left font-medium">Issue</th>
						<th className="px-3 py-2 text-left font-medium">Summary</th>
						<th className="px-3 py-2 text-left font-medium">Status</th>
						<th className="px-3 py-2 text-left font-medium">Type</th>
						<th className="px-3 py-2 text-left font-medium">Relation</th>
						<th className="w-8" />
					</tr>
				</thead>
				<tbody>
					{issues.map((t) => (
						<tr
							key={t.id}
							className="border-b border-border/40 hover:bg-muted/40"
						>
							<td className="px-3 py-1.5 font-mono text-[11px]">{t.id}</td>
							<td className="max-w-[360px] truncate px-3 py-1.5">
								{displayText(t.title, "Issue details unavailable")}
							</td>
							<td className="px-3 py-1.5">
								<span
									className={cn(
										"rounded px-1.5 py-0.5 text-[10px] font-medium",
										statusClass(t.status),
									)}
								>
									{statusLabel(t.status)}
								</span>
							</td>
							<td className="px-3 py-1.5 text-[11px] text-muted-foreground">
								{displayText(t.issue_type, "Unknown type")}
							</td>
							<td className="px-3 py-1.5 text-[11px] text-muted-foreground">
								{displayText(t.dependency_type, "tracks")}
							</td>
							<td className="px-2 py-1.5">
								<button
									type="button"
									onClick={() => onCopy(t.id)}
									aria-label={`Copy ${t.id}`}
									className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:outline-none"
								>
									<HiOutlineClipboard className="size-3.5" />
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	);
}
