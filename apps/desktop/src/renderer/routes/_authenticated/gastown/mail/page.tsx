import { createFileRoute } from "@tanstack/react-router";
import { MailPanel } from "renderer/components/Gastown/MailPanel";

export const Route = createFileRoute("/_authenticated/gastown/mail/")({
	component: GastownMailPage,
});

function GastownMailPage() {
	return (
		<div className="flex h-full w-full flex-col bg-background">
			<div className="min-h-0 flex-1">
				<MailPanel />
			</div>
		</div>
	);
}
