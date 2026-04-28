import { ConvoyBoard } from "renderer/components/Gastown/ConvoyBoard";
import type { BaseTab, Pane } from "shared/tabs-types";

interface ConvoysPaneProps {
	pane: Pane;
	tab: BaseTab;
}

export function ConvoysPane(_props: ConvoysPaneProps) {
	return (
		<div
			data-convoys-root
			className="flex h-full w-full min-w-[320px] flex-col bg-background"
		>
			<ConvoyBoard />
		</div>
	);
}
