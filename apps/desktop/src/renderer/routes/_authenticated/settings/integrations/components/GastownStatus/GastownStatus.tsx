import type { AppRouter as HostAppRouter } from "@spectralset/host-service";
import { Badge } from "@spectralset/ui/badge";
import { Skeleton } from "@spectralset/ui/skeleton";
import type { inferRouterOutputs } from "@trpc/server";

type ProbeResult =
	inferRouterOutputs<HostAppRouter>["host"]["gastown"]["probe"];

interface GastownStatusProps {
	probe: ProbeResult | undefined;
	isLoading: boolean;
	error: boolean;
}

export function GastownStatus({ probe, isLoading, error }: GastownStatusProps) {
	if (isLoading) {
		return <Skeleton className="h-5 w-24" />;
	}

	if (error) {
		return <Badge variant="destructive">Probe failed</Badge>;
	}

	if (!probe?.installed) {
		return (
			<Badge variant="secondary" className="gap-1">
				Not detected
			</Badge>
		);
	}

	return (
		<Badge variant="default" className="gap-1">
			Detected{probe.version ? ` — ${probe.version}` : ""}
		</Badge>
	);
}
