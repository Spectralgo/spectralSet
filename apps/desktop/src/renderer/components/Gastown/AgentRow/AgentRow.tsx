import type { RigAgent } from "@spectralset/gastown-cli-client";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@spectralset/ui/context-menu";
import { cn } from "@spectralset/ui/utils";
import type { IconType } from "react-icons";
import {
	HiOutlineBolt,
	HiOutlineEye,
	HiOutlineStar,
	HiOutlineUsers,
	HiOutlineWrench,
} from "react-icons/hi2";
import { LuTerminal } from "react-icons/lu";

const ROLE_ICON: Record<RigAgent["role"], IconType> = {
	mayor: HiOutlineStar,
	refinery: HiOutlineWrench,
	witness: HiOutlineEye,
	crew: HiOutlineUsers,
	polecat: HiOutlineBolt,
};

const ROLE_LABEL: Record<RigAgent["role"], string> = {
	mayor: "mayor",
	refinery: "refinery",
	witness: "witness",
	crew: "crew",
	polecat: "polecat",
};

const STATE_DOT_CLASS: Record<NonNullable<RigAgent["state"]>, string> = {
	working: "bg-emerald-500",
	idle: "bg-amber-500",
	done: "bg-muted-foreground/40",
	stalled: "bg-red-500",
	zombie: "bg-red-500",
	nuked: "bg-neutral-500",
};

interface AgentRowProps {
	agent: RigAgent;
	onAttach: (agent: RigAgent) => void;
}

// Resolve display label + dot color from running + state.
// gt status reports state="idle" for both "alive and waiting" and "stopped"
// (no tmux session). The renderer must distinguish them so a stopped agent
// doesn't look identical to a healthy idle one.
function resolveDisplay(
	agent: RigAgent,
): { label: string; dotClass: string | null } {
	if (!agent.running) {
		return { label: "stopped", dotClass: "bg-neutral-600" };
	}
	if (agent.state) {
		return { label: agent.state, dotClass: STATE_DOT_CLASS[agent.state] };
	}
	// running=true but no state field (e.g. spectralPaper refinery/witness
	// before they take any work). Show as "ready" with a neutral dot rather
	// than falling back to the role name (which is misleading).
	return { label: "ready", dotClass: "bg-muted-foreground/40" };
}

export function AgentRow({ agent, onAttach }: AgentRowProps) {
	const Icon = ROLE_ICON[agent.role];
	const { label, dotClass } = resolveDisplay(agent);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					type="button"
					onClick={() => onAttach(agent)}
					className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
					aria-label={`Attach ${agent.rig}/${agent.name} (${ROLE_LABEL[agent.role]})`}
				>
					<Icon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
					<span className="truncate font-medium">{agent.name}</span>
					<span className="min-w-0 flex-1 truncate text-muted-foreground">
						{label}
					</span>
					{dotClass ? (
						<span
							aria-hidden
							className={cn("size-2 shrink-0 rounded-full", dotClass)}
						/>
					) : null}
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={() => onAttach(agent)}>
					<LuTerminal className="mr-2 size-4" />
					Attach Terminal
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
