import type { Polecat, PolecatState } from "@spectralset/gastown-cli-client";
import { cn } from "@spectralset/ui/utils";

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
	onClick: () => void;
}

export function PolecatRow({ polecat, onClick }: PolecatRowProps) {
	const label = polecat.currentBeadTitle ?? polecat.currentBead ?? "";
	return (
		<button
			type="button"
			onClick={onClick}
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
	);
}
