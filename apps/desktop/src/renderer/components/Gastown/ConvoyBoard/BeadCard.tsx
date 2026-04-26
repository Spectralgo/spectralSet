import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "@spectralset/ui/atoms/Avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@spectralset/ui/tooltip";
import { cn } from "@spectralset/ui/utils";
import type { ConvoyBead } from "./types";

const PRIORITY_CLASS = [
	"bg-red-500/15 text-red-600 dark:text-red-400",
	"bg-orange-500/15 text-orange-600 dark:text-orange-400",
	"bg-amber-500/15 text-amber-600 dark:text-amber-400",
	"bg-muted text-muted-foreground",
	"bg-muted text-muted-foreground",
];

interface BeadCardProps {
	bead: ConvoyBead;
	onClick?: (id: string) => void;
	stackCount?: number;
}

export function BeadCard({ bead, onClick, stackCount }: BeadCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: bead.id, data: { type: "bead", bead } });
	const stranded = bead.status === "stranded";
	const hooked = bead.status === "hooked";
	const p = Math.max(0, Math.min(4, bead.priority));
	const card = (
		// biome-ignore lint/a11y/useSemanticElements: Draggable card requires div for dnd-kit, button cannot receive drag attributes
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			{...attributes}
			{...listeners}
			role="button"
			tabIndex={0}
			onClick={() => onClick?.(bead.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.(bead.id);
				}
			}}
			className={cn(
				"relative cursor-grab rounded-md border border-border/60 bg-card px-3 py-2 transition-colors hover:bg-accent/30 active:cursor-grabbing",
				isDragging && "opacity-40",
				stranded && "ring-2 ring-orange-500",
			)}
		>
			<div className="mb-1 flex items-center justify-between gap-2">
				<span className="font-mono text-[10px] text-muted-foreground">
					{bead.id}
				</span>
				<div className="flex items-center gap-1.5">
					<span
						className={cn(
							"rounded px-1 py-0.5 text-[10px] font-medium",
							PRIORITY_CLASS[p],
						)}
					>
						P{p}
					</span>
					{hooked && bead.assignee && (
						<Avatar
							size="xs"
							fullName={bead.assignee}
							className="rounded-full"
						/>
					)}
					{stackCount && stackCount > 1 && (
						<span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
							+{stackCount - 1}
						</span>
					)}
				</div>
			</div>
			<p className="line-clamp-2 text-xs leading-snug">{bead.title}</p>
		</div>
	);
	if (!stranded) return card;
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>{card}</TooltipTrigger>
				<TooltipContent>no polecat available</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
