import { Badge } from "@spectralset/ui/badge";
import { useInflightQueries } from "renderer/hooks/useInflightQueries";

export function InflightIndicator() {
	const { loading, mutating, stale } = useInflightQueries();

	if (loading === 0 && mutating === 0) return null;

	const parts: string[] = [];
	if (loading > 0) parts.push(`${loading} loading`);
	if (mutating > 0) parts.push(`${mutating} mutating`);

	return (
		<Badge
			variant="secondary"
			data-testid="inflight-indicator"
			aria-live="polite"
			title={stale > 0 ? `${stale} stale` : undefined}
			className="fixed top-1.5 right-3 z-50 text-[11px] font-medium"
		>
			{parts.join(" · ")}
		</Badge>
	);
}
