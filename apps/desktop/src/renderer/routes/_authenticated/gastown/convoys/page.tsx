import { createFileRoute } from "@tanstack/react-router";
import { ConvoyBoard } from "renderer/components/Gastown/ConvoyBoard";

export const Route = createFileRoute("/_authenticated/gastown/convoys/")({
	component: GastownConvoysPage,
});

function GastownConvoysPage() {
	return (
		<div className="h-screen w-screen bg-background">
			<ConvoyBoard />
		</div>
	);
}
