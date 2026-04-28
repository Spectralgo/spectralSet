import type { BeadDetail } from "@spectralset/gastown-cli-client";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@spectralset/ui/sheet";
import { cn } from "@spectralset/ui/utils";
import { formatDistanceToNow } from "date-fns";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpc } from "renderer/lib/electron-trpc";

const STATUS_CLASS: Record<string, string> = {
	open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
	in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	hooked: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	closed: "bg-muted text-muted-foreground",
	blocked: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function statusClass(status: string) {
	return STATUS_CLASS[status] ?? "bg-muted text-muted-foreground";
}

function statusLabel(status: string) {
	if (status === "closed") return "Done";
	if (status === "in_progress") return "In progress";
	return status
		.split("_")
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(" ");
}

function safeRelativeTime(value: string | null) {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return formatDistanceToNow(d, { addSuffix: true });
}

interface BeadDetailDrawerProps {
	beadId: string | null;
	onClose: () => void;
}

export function BeadDetailDrawer({ beadId, onClose }: BeadDetailDrawerProps) {
	const townPath = useGastownTownPath() || undefined;
	const detailQuery = electronTrpc.gastown.beads.detail.useQuery(
		{ beadId: beadId ?? "", townPath },
		{ enabled: !!beadId, refetchOnWindowFocus: false },
	);
	const detail = detailQuery.data ?? null;

	return (
		<Sheet open={!!beadId} onOpenChange={(next) => !next && onClose()}>
			<SheetContent side="right" className="w-full sm:max-w-xl">
				<SheetHeader className="border-b pb-3">
					<SheetTitle className="font-mono text-sm">
						{beadId ?? "bead"}
					</SheetTitle>
					<SheetDescription className="text-xs">Issue detail</SheetDescription>
				</SheetHeader>
				<div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
					{detailQuery.error ? (
						<p className="text-xs text-destructive">
							Failed to load bead: {detailQuery.error.message}
						</p>
					) : detailQuery.isLoading && !detail ? (
						<p className="text-xs text-muted-foreground">Loading…</p>
					) : !detail ? (
						<p className="text-xs text-muted-foreground">
							No detail available.
						</p>
					) : (
						<BeadDetailBody detail={detail} />
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function BeadDetailBody({ detail }: { detail: BeadDetail }) {
	return (
		<div className="flex flex-col gap-4">
			<section>
				<div className="flex items-center gap-2">
					<span
						className={cn(
							"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
							statusClass(detail.status),
						)}
					>
						{statusLabel(detail.status)}
					</span>
					<h2 className="min-w-0 flex-1 truncate text-base font-semibold">
						{detail.title || "—"}
					</h2>
				</div>
				<div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
					<span>
						priority{" "}
						<span className="font-medium text-foreground">
							P{detail.priority}
						</span>
					</span>
					{detail.issueType && (
						<span>
							type{" "}
							<span className="font-medium text-foreground">
								{detail.issueType}
							</span>
						</span>
					)}
					<span>
						hooked{" "}
						<span className="font-medium text-foreground">
							{detail.assignee ?? "—"}
						</span>
					</span>
					<span>updated {safeRelativeTime(detail.updatedAt)}</span>
				</div>
			</section>

			{detail.description && (
				<section>
					<h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
						Description
					</h3>
					<pre className="whitespace-pre-wrap break-words rounded border border-border/60 bg-muted/20 p-3 font-mono text-[11px] leading-snug text-foreground">
						{detail.description}
					</pre>
				</section>
			)}

			<section>
				<h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
					Tracking sprints
				</h3>
				{detail.convoys.length === 0 ? (
					<p className="text-[11px] text-muted-foreground">
						Not tracked by any sprint.
					</p>
				) : (
					<ul className="flex flex-col gap-1">
						{detail.convoys.map((c) => (
							<li
								key={c.id}
								className="flex items-center gap-2 rounded border border-border/40 px-2 py-1.5 text-xs"
							>
								<span
									className={cn(
										"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
										statusClass(c.status),
									)}
								>
									{statusLabel(c.status)}
								</span>
								<span className="min-w-0 flex-1 truncate">{c.title}</span>
								<span className="shrink-0 font-mono text-[10px] text-muted-foreground">
									{c.id}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
