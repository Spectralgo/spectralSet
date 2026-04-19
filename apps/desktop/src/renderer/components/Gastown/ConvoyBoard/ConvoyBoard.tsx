import type { Convoy, ConvoyTracked } from "@spectralset/gastown-cli-client";
import { Progress } from "@spectralset/ui/progress";
import { toast } from "@spectralset/ui/sonner";
import { Switch } from "@spectralset/ui/switch";
import { cn } from "@spectralset/ui/utils";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { HiOutlineClipboard, HiOutlineTruck } from "react-icons/hi2";
import { electronTrpc } from "renderer/lib/electron-trpc";

const STATUS_CLASS: Record<string, string> = {
	open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
	in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	closed: "bg-muted text-muted-foreground",
	blocked: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function statusClass(status: string): string {
	return STATUS_CLASS[status] ?? "bg-muted text-muted-foreground";
}

function progressCounts(c: Convoy): { completed: number; total: number } {
	const total = c.total ?? c.tracked.length;
	const fromTracked = c.tracked.filter((t) => t.status === "closed").length;
	const completed = c.completed != null ? c.completed : fromTracked;
	return { completed, total };
}

function safeRelativeTime(value: string): string {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return formatDistanceToNow(d, { addSuffix: true });
}

export function ConvoyBoard() {
	const [showAll, setShowAll] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const listQuery = electronTrpc.gastown.convoys.list.useQuery(
		{ all: showAll },
		{ refetchInterval: 10_000, refetchOnWindowFocus: false },
	);

	const convoys = listQuery.data ?? [];
	const resolvedSelectedId = useMemo(
		() =>
			convoys.find((c) => c.id === selectedId)?.id ?? convoys[0]?.id ?? null,
		[convoys, selectedId],
	);

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
				<HiOutlineTruck className="size-5 text-muted-foreground" />
				<h1 className="text-sm font-medium">Convoys</h1>
				<div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
					<label htmlFor="convoy-show-closed" className="cursor-pointer">
						Show closed
					</label>
					<Switch
						id="convoy-show-closed"
						checked={showAll}
						onCheckedChange={(next) => {
							setShowAll(next);
							setSelectedId(null);
						}}
						aria-label="Show closed convoys"
					/>
				</div>
			</header>
			<div className="flex min-h-0 flex-1">
				<ConvoyList
					convoys={convoys}
					isLoading={listQuery.isLoading}
					isError={!!listQuery.error}
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
	selectedId: string | null;
	onSelect: (id: string) => void;
}

function ConvoyList({
	convoys,
	isLoading,
	isError,
	selectedId,
	onSelect,
}: ConvoyListProps) {
	const body = isError ? (
		<div className="p-4 text-xs text-destructive">
			Failed to load convoys. Is Gas Town running?
		</div>
	) : isLoading ? (
		<div className="p-4 text-xs text-muted-foreground">Loading…</div>
	) : convoys.length === 0 ? (
		<div className="p-4 text-xs text-muted-foreground">No open convoys.</div>
	) : (
		convoys.map((c) => {
			const { completed, total } = progressCounts(c);
			const selected = c.id === selectedId;
			return (
				<button
					key={c.id}
					type="button"
					onClick={() => onSelect(c.id)}
					aria-current={selected ? "true" : undefined}
					className={cn(
						"flex flex-col gap-1 border-b border-border/40 px-3 py-2 text-left text-xs transition-colors",
						"hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
						selected && "bg-accent",
					)}
				>
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
								statusClass(c.status),
							)}
						>
							{c.status}
						</span>
						<span className="truncate font-medium">{c.title}</span>
					</div>
					<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
						<span className="font-mono">
							{completed}/{total}
						</span>
						<span className="ml-auto shrink-0">
							{safeRelativeTime(c.created_at)}
						</span>
					</div>
				</button>
			);
		})
	);
	return (
		<div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-border/60">
			{body}
		</div>
	);
}

interface ConvoyDetailProps {
	id: string | null;
}

function ConvoyDetail({ id }: ConvoyDetailProps) {
	const statusQuery = electronTrpc.gastown.convoys.status.useQuery(
		{ id: id ?? "" },
		{ enabled: !!id, refetchInterval: 10_000, refetchOnWindowFocus: false },
	);

	if (!id) {
		return (
			<div className="flex flex-1 items-center justify-center p-8 text-xs text-muted-foreground">
				Select a convoy to inspect.
			</div>
		);
	}
	if (statusQuery.isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center p-8 text-xs text-muted-foreground">
				Loading convoy…
			</div>
		);
	}
	const convoy = statusQuery.data;
	if (!convoy) {
		return (
			<div className="flex flex-1 items-center justify-center p-8 text-xs text-destructive">
				Convoy not found.
			</div>
		);
	}

	const { completed, total } = progressCounts(convoy);
	const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<div className="border-b border-border/60 px-4 py-3">
				<div className="flex items-center gap-2">
					<h2 className="truncate text-sm font-semibold">{convoy.title}</h2>
					<span
						className={cn(
							"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
							statusClass(convoy.status),
						)}
					>
						{convoy.status}
					</span>
				</div>
				<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
					<span className="font-mono">{convoy.id}</span>
					<span>{safeRelativeTime(convoy.created_at)}</span>
				</div>
				<div className="mt-3 flex items-center gap-3">
					<Progress value={percent} className="h-1.5 flex-1" />
					<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
						{completed}/{total}
					</span>
				</div>
			</div>
			<TrackedTable tracked={convoy.tracked} />
		</div>
	);
}

function TrackedTable({ tracked }: { tracked: ConvoyTracked[] }) {
	if (tracked.length === 0) {
		return (
			<div className="p-4 text-xs text-muted-foreground">
				No tracked issues.
			</div>
		);
	}
	const onCopy = async (id: string) => {
		try {
			await navigator.clipboard.writeText(id);
			toast.success(`Copied ${id}`);
		} catch {
			toast.error("Copy failed");
		}
	};
	return (
		<div className="min-h-0 flex-1 overflow-auto">
			<table className="w-full text-xs">
				<thead className="sticky top-0 bg-background text-[11px] text-muted-foreground">
					<tr className="border-b border-border/60">
						<th className="px-3 py-2 text-left font-medium">ID</th>
						<th className="px-3 py-2 text-left font-medium">Title</th>
						<th className="px-3 py-2 text-left font-medium">Status</th>
						<th className="px-3 py-2 text-left font-medium">Type</th>
						<th className="px-3 py-2 text-left font-medium">Dep</th>
						<th className="w-8" />
					</tr>
				</thead>
				<tbody>
					{tracked.map((t) => (
						<tr
							key={t.id}
							className="border-b border-border/40 hover:bg-muted/40"
						>
							<td className="px-3 py-1.5 font-mono text-[11px]">{t.id}</td>
							<td className="max-w-[360px] truncate px-3 py-1.5">{t.title}</td>
							<td className="px-3 py-1.5">
								<span
									className={cn(
										"rounded px-1.5 py-0.5 text-[10px] font-medium",
										statusClass(t.status),
									)}
								>
									{t.status}
								</span>
							</td>
							<td className="px-3 py-1.5 text-[11px] text-muted-foreground">
								{t.issue_type}
							</td>
							<td className="px-3 py-1.5 text-[11px] text-muted-foreground">
								{t.dependency_type}
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
		</div>
	);
}
