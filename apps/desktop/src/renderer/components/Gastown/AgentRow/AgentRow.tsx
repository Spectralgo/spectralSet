import type { RigAgent } from "@spectralset/gastown-cli-client";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@spectralset/ui/context-menu";
import { cn } from "@spectralset/ui/utils";
import { useState } from "react";
import type { IconType } from "react-icons";
import {
	HiOutlineBolt,
	HiOutlineEye,
	HiOutlineStar,
	HiOutlineUsers,
	HiOutlineWrench,
} from "react-icons/hi2";
import { LuTerminal } from "react-icons/lu";
import { electronTrpc } from "renderer/lib/electron-trpc";
import {
	type ClaudePolecatLiveness,
	DOT_CLASS,
	deriveCloneDir,
	resolveDisplay,
} from "renderer/lib/gastown/agentDisplay";

const ROLE_ICON: Record<RigAgent["role"], IconType> = {
	mayor: HiOutlineStar,
	refinery: HiOutlineWrench,
	witness: HiOutlineEye,
	crew: HiOutlineUsers,
	polecat: HiOutlineBolt,
};

interface AgentRowProps {
	agent: RigAgent;
	townRoot: string | null | undefined;
	onAttach: (agent: RigAgent) => void;
}

export function AgentRow({ agent, townRoot, onAttach }: AgentRowProps) {
	const Icon = ROLE_ICON[agent.role];
	const cloneDir = deriveCloneDir({
		townRoot,
		role: agent.role,
		rig: agent.rig,
		name: agent.name,
	});
	const [jsonlState, setJsonlState] = useState<ClaudePolecatLiveness>();
	electronTrpc.gastown.agents.sessionState.useSubscription(
		cloneDir
			? { rig: agent.rig, name: agent.name, cloneDir }
			: (undefined as never),
		{
			enabled: Boolean(cloneDir),
			onData: (event) => setJsonlState(event.state),
		},
	);
	const { label, dotColor } = resolveDisplay(agent, jsonlState);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					type="button"
					onClick={() => onAttach(agent)}
					className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
					aria-label={`Attach ${agent.rig}/${agent.name} (${agent.role})`}
				>
					<Icon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
					<span className="truncate font-medium">{agent.name}</span>
					<span className="min-w-0 flex-1 truncate text-muted-foreground">
						{label}
					</span>
					<span
						aria-hidden
						className={cn("size-2 shrink-0 rounded-full", DOT_CLASS[dotColor])}
					/>
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
