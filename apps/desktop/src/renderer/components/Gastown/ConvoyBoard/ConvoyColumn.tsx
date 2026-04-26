import { useDroppable } from "@dnd-kit/core";
import { cn } from "@spectralset/ui/utils";
import type { ReactNode } from "react";
import { HiOutlineInbox } from "react-icons/hi2";
import type { BeadStatus, ConvoyBead } from "./ConvoyBoardShell";

interface ConvoyColumnProps {
	status: BeadStatus;
	label: string;
	beads: ConvoyBead[];
	renderCard: (bead: ConvoyBead) => ReactNode;
}

export function ConvoyColumn({
	status,
	label,
	beads,
	renderCard,
}: ConvoyColumnProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: `column-${status}`,
		data: { type: "column", statusId: status },
	});

	return (
		<div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
			<div className="flex items-center gap-2 px-2 py-1.5 mb-1">
				<span className="text-sm font-medium">{label}</span>
				<span className="text-xs text-muted-foreground tabular-nums">
					{beads.length}
				</span>
			</div>
			<div
				ref={setNodeRef}
				className={cn(
					"flex-1 flex flex-col gap-1 overflow-y-auto min-h-[120px] rounded-md p-0.5 transition-colors",
					isOver && "bg-accent/20 ring-1 ring-accent/40",
				)}
			>
				{beads.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-1 py-8 text-muted-foreground/60">
						<HiOutlineInbox className="size-5" />
						<span className="text-[11px]">No beads</span>
					</div>
				) : (
					beads.map((b) => <div key={b.id}>{renderCard(b)}</div>)
				)}
			</div>
		</div>
	);
}
