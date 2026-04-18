import type { Bead } from "@spectralset/gastown-cli-client";
import { Input } from "@spectralset/ui/input";
import { cn } from "@spectralset/ui/utils";
import { useMemo, useState } from "react";

interface BeadPickerProps {
	beads: Bead[];
	selectedId: string | null;
	onSelect: (beadId: string) => void;
	isLoading?: boolean;
	errorMessage?: string;
	emptyMessage: string;
}

export function BeadPicker({
	beads,
	selectedId,
	onSelect,
	isLoading,
	errorMessage,
	emptyMessage,
}: BeadPickerProps) {
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return beads;
		return beads.filter(
			(bead) =>
				bead.id.toLowerCase().includes(q) ||
				bead.title.toLowerCase().includes(q),
		);
	}, [beads, search]);

	return (
		<div className="flex flex-col gap-2">
			<Input
				placeholder="Search beads…"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				className="h-8 text-sm"
			/>
			<div className="min-h-[140px] max-h-[240px] overflow-y-auto rounded-md border border-border bg-background/40">
				{errorMessage ? (
					<div className="p-3 text-xs text-destructive">{errorMessage}</div>
				) : isLoading ? (
					<div className="p-3 text-xs text-muted-foreground">
						Loading beads…
					</div>
				) : filtered.length === 0 ? (
					<div className="p-3 text-xs text-muted-foreground">
						{beads.length === 0
							? emptyMessage
							: `No beads match “${search.trim()}”.`}
					</div>
				) : (
					<ul className="divide-y divide-border">
						{filtered.map((bead) => (
							<li key={bead.id}>
								<button
									type="button"
									onClick={() => onSelect(bead.id)}
									className={cn(
										"flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
										selectedId === bead.id && "bg-primary/10",
									)}
								>
									<div className="flex w-full items-center gap-2">
										<span className="font-mono text-[11px] text-muted-foreground">
											{bead.id}
										</span>
										<PriorityBadge priority={bead.priority} />
										<TypeBadge type={bead.type} />
										<StatusBadge status={bead.status} />
									</div>
									<div className="line-clamp-2 text-sm text-foreground">
										{bead.title}
									</div>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

function PriorityBadge({ priority }: { priority: number }) {
	const tone =
		priority === 0
			? "bg-destructive/15 text-destructive"
			: priority === 1
				? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
				: "bg-muted text-muted-foreground";
	return (
		<span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", tone)}>
			P{priority}
		</span>
	);
}

function TypeBadge({ type }: { type: string }) {
	if (!type) return null;
	return (
		<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
			{type}
		</span>
	);
}

function StatusBadge({ status }: { status: string }) {
	if (!status || status === "open") return null;
	return (
		<span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
			{status}
		</span>
	);
}
