import type { BaseTab, Pane } from "shared/tabs-types";

interface TodayPaneProps {
	pane: Pane;
	tab: BaseTab;
}

export function TodayPane({ pane, tab }: TodayPaneProps) {
	return (
		<div className="flex h-full w-full min-w-[320px] flex-col bg-background">
			<div className="text-xs text-muted-foreground p-4">
				TodayPane scaffold (ss-6mlj) — body lands next
			</div>
		</div>
	);
}
