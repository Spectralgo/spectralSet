import { AgentCVPanel } from "renderer/components/Gastown/AgentCVPanel";
import { PaneErrorBoundary } from "renderer/components/Shell/PaneErrorBoundary";
import type { BaseTab, Pane } from "shared/tabs-types";

interface AgentsPaneProps {
	pane: Pane;
	tab: BaseTab;
}

export function AgentsPane(_props: AgentsPaneProps) {
	return (
		<div
			data-agents-root
			className="flex h-full w-full min-w-[320px] flex-col bg-background"
		>
			<PaneErrorBoundary>
				<AgentCVPanel />
			</PaneErrorBoundary>
		</div>
	);
}
