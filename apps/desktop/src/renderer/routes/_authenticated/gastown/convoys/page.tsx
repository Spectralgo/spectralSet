import { createFileRoute } from "@tanstack/react-router";
import { ConvoyBoard } from "renderer/components/Gastown/ConvoyBoard";

export const Route = createFileRoute("/_authenticated/gastown/convoys/")({
	component: GastownConvoysPage,
});

function GastownConvoysPage() {
	return (
		<div className="flex h-full w-full flex-col bg-background">
			<div className="min-h-0 flex-1">
				<ConvoyBoard />
			</div>
		</div>
	);
}
