import { createFileRoute } from "@tanstack/react-router";
import { AgentCVPanel } from "renderer/components/Gastown/AgentCVPanel";

export const Route = createFileRoute("/_authenticated/gastown/agents/")({
	component: GastownAgentsPage,
});

function GastownAgentsPage() {
	return (
		<div className="flex h-full w-full flex-col bg-background">
			<div className="min-h-0 flex-1">
				<AgentCVPanel />
			</div>
		</div>
	);
}
