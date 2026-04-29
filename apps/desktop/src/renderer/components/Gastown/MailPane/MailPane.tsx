import { MailPanel } from "renderer/components/Gastown/MailPanel";
import { PaneErrorBoundary } from "renderer/components/Shell/PaneErrorBoundary";
import type { BaseTab, Pane } from "shared/tabs-types";

interface MailPaneProps {
	pane: Pane;
	tab: BaseTab;
}

export function MailPane(_props: MailPaneProps) {
	return (
		<div
			data-mail-root
			className="flex h-full w-full min-w-[320px] flex-col bg-background"
		>
			<PaneErrorBoundary>
				<MailPanel />
			</PaneErrorBoundary>
		</div>
	);
}
