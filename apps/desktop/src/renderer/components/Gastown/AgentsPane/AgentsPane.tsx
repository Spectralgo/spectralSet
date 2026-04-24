import { AgentCVPanel } from "renderer/components/Gastown/AgentCVPanel";
import type { BaseTab, Pane } from "shared/tabs-types";

interface AgentsPaneProps {
	pane: Pane;
	tab: BaseTab;
}

export function AgentsPane({ pane, tab }: AgentsPaneProps) {
	return (
		<div
			data-agents-root
			className="flex h-full w-full min-w-[320px] flex-col bg-background"
		>
			<AgentCVPanel />
		</div>
	);
}
