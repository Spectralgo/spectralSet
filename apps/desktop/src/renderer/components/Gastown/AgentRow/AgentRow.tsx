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

export function AgentRow({ agent, onAttach }: AgentRowProps) {
	const Icon = ROLE_ICON[agent.role];
	const stateLabel = agent.state ?? ROLE_LABEL[agent.role];
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
						{stateLabel}
					</span>
					{agent.state ? (
						<span
							aria-hidden
							className={cn(
								"size-2 shrink-0 rounded-full",
								STATE_DOT_CLASS[agent.state],
							)}
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
