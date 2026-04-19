import { createFileRoute } from "@tanstack/react-router";
import { AgentCVPanel } from "renderer/components/Gastown/AgentCVPanel";

export const Route = createFileRoute("/_authenticated/gastown/agents/")({
	component: GastownAgentsPage,
});

function GastownAgentsPage() {
	return (
		<div className="h-screen w-screen bg-background">
			<AgentCVPanel />
		</div>
	);
}
