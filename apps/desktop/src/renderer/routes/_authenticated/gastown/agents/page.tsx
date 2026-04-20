import { createFileRoute } from "@tanstack/react-router";
import { AgentCVPanel } from "renderer/components/Gastown/AgentCVPanel";
import { electronTrpc } from "renderer/lib/electron-trpc";

export const Route = createFileRoute("/_authenticated/gastown/agents/")({
	component: GastownAgentsPage,
});

function GastownAgentsPage() {
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	const isMac = platform === undefined || platform === "darwin";
	return (
		<div className="flex h-screen w-screen flex-col bg-background">
			<div
				className="drag h-8 w-full shrink-0 bg-background"
				style={{ paddingLeft: isMac ? "88px" : "16px" }}
			/>
			<div className="min-h-0 flex-1">
				<AgentCVPanel />
			</div>
		</div>
	);
}
