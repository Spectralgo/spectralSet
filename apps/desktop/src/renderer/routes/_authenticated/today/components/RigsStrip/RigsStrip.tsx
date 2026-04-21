import { cn } from "@spectralset/ui/utils";
import {
	type RigDotState,
	type RigReason,
	reasonDotState,
	reasonTemplate,
} from "./reasonTemplate";

export interface RigStripRow {
	name: string;
	reason: RigReason;
}

export interface RigsStripProps {
	rigs: readonly RigStripRow[];
}

export function RigsStrip({ rigs }: RigsStripProps) {
	if (rigs.length === 0) return null;
	return (
		<ul className="flex flex-col gap-3" data-testid="rigs-strip">
			{rigs.map((rig) => {
				const state = reasonDotState(rig.reason);
				return (
					<li
						key={rig.name}
						className="flex items-center gap-2"
						data-testid="rigs-strip-row"
						data-rig={rig.name}
						data-state={state}
					>
						<RigDot state={state} />
						<span className="text-sm text-foreground">{rig.name}</span>
						<span className="text-sm text-muted-foreground">
							{reasonTemplate(rig.reason)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}

function RigDot({ state }: { state: RigDotState }) {
	if (state === "zombie") {
		return (
			<span
				aria-hidden="true"
				className="inline-flex h-3 w-3 shrink-0 items-center justify-center text-red-500 text-xs leading-none"
			>
				✕
			</span>
		);
	}
	const tone = state === "working" ? "bg-blue-500" : "border border-amber-500";
	return (
		<span
			aria-hidden="true"
			className={cn("inline-block h-2 w-2 shrink-0 rounded-full", tone)}
		/>
	);
}
