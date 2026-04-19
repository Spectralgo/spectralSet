import { createFileRoute } from "@tanstack/react-router";
import { MailPanel } from "renderer/components/Gastown/MailPanel";

export const Route = createFileRoute("/_authenticated/gastown/mail/")({
	component: GastownMailPage,
});

function GastownMailPage() {
	return (
		<div className="h-screen w-screen bg-background">
			<MailPanel />
		</div>
	);
}
