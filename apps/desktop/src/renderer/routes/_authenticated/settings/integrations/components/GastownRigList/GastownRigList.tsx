import { Skeleton } from "@spectralset/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

export function GastownRigList() {
	const { activeHostUrl } = useLocalHostService();

	const {
		data: rigs,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["host", "gastown", "listRigs", activeHostUrl],
		queryFn: async () => {
			if (!activeHostUrl) return [];
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.listRigs.query();
		},
		enabled: !!activeHostUrl,
		refetchOnWindowFocus: false,
	});

	if (!activeHostUrl) {
		return (
			<p className="text-sm text-muted-foreground">Waiting for host service…</p>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-sm text-destructive">
				Failed to load rigs: {(error as Error).message}
			</p>
		);
	}

	if (!rigs || rigs.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No rigs found. Run{" "}
				<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
					gt rig add &lt;name&gt; &lt;git-url&gt;
				</code>{" "}
				in your terminal to create one.
			</p>
		);
	}

	return (
		<ul className="divide-y rounded-md border">
			{rigs.map((rig) => (
				<li
					key={rig.name}
					className="flex items-center justify-between px-3 py-2 text-sm"
				>
					<span className="font-medium">{rig.name}</span>
					<div className="flex items-center gap-3 text-xs text-muted-foreground">
						<HealthDot label="witness" running={rig.witnessRunning} />
						<HealthDot label="refinery" running={rig.refineryRunning} />
						<span>
							{rig.polecatCount} polecat{rig.polecatCount === 1 ? "" : "s"}
						</span>
					</div>
				</li>
			))}
		</ul>
	);
}

function HealthDot({ label, running }: { label: string; running: boolean }) {
	return (
		<span className="flex items-center gap-1">
			<span
				aria-hidden
				className={
					running
						? "size-2 rounded-full bg-emerald-500"
						: "size-2 rounded-full bg-muted-foreground/40"
				}
			/>
			<span>{label}</span>
		</span>
	);
}
