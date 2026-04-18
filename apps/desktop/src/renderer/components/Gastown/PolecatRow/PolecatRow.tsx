import type { Polecat, PolecatState } from "@spectralset/gastown-cli-client";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@spectralset/ui/context-menu";
import { cn } from "@spectralset/ui/utils";
import { LuEye, LuTrash2 } from "react-icons/lu";

const STATE_DOT_CLASS: Record<PolecatState, string> = {
	working: "bg-emerald-500",
	idle: "bg-muted-foreground/40",
	stalled: "bg-amber-500",
	zombie: "bg-red-500",
	done: "bg-blue-500",
	nuked: "bg-neutral-500",
};

const STATE_LABEL: Record<PolecatState, string> = {
	working: "working",
	idle: "idle",
	stalled: "stalled",
	zombie: "zombie",
	done: "done",
	nuked: "nuked",
};

interface PolecatRowProps {
	polecat: Polecat;
	onPeek: () => void;
	onNuke: () => void;
}

export function PolecatRow({ polecat, onPeek, onNuke }: PolecatRowProps) {
	const label = polecat.currentBeadTitle ?? polecat.currentBead ?? "";
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					type="button"
					onClick={onPeek}
					className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
					aria-label={`Peek ${polecat.rig}/${polecat.name} (${STATE_LABEL[polecat.state]})`}
				>
					<span
						aria-hidden
						className={cn(
							"size-2 shrink-0 rounded-full",
							STATE_DOT_CLASS[polecat.state],
						)}
					/>
					<span className="truncate font-medium">{polecat.name}</span>
					{label ? (
						<span className="min-w-0 flex-1 truncate text-muted-foreground">
							{label}
						</span>
					) : (
						<span className="min-w-0 flex-1 truncate text-muted-foreground">
							{STATE_LABEL[polecat.state]}
						</span>
					)}
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={onPeek}>
					<LuEye className="mr-2 size-4" />
					Peek
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive" onSelect={onNuke}>
					<LuTrash2 className="mr-2 size-4" />
					Nuke…
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
