import type { Polecat } from "@spectralset/gastown-cli-client";
import { Button } from "@spectralset/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@spectralset/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
	HiChevronDown,
	HiChevronRight,
	HiOutlineArrowPath,
} from "react-icons/hi2";
import {
	NukeConfirmDialog,
	type NukeTarget,
} from "renderer/components/Gastown/NukeConfirmDialog";
import {
	PolecatPeekDrawer,
	type PolecatPeekTarget,
} from "renderer/components/Gastown/PolecatPeekDrawer";
import { PolecatRow } from "renderer/components/Gastown/PolecatRow";
import { useGastownFleet } from "renderer/hooks/useGastownFleet";
import { electronTrpcClient } from "renderer/lib/trpc-client";

// Shares the key with GastownCard so toggle + sidebar read the same cache.
const ENABLED_QUERY_KEY = ["electron", "settings", "gastownEnabled"] as const;

export function GastownSidebarSection() {
	const enabledQuery = useQuery({
		queryKey: ENABLED_QUERY_KEY,
		queryFn: () => electronTrpcClient.settings.getGastownEnabled.query(),
	});

	const enabled = enabledQuery.data?.enabled ?? false;

	if (!enabled) return null;

	return <GastownSidebarSectionBody />;
}

function GastownSidebarSectionBody() {
	const [open, setOpen] = useState(true);
	const [target, setTarget] = useState<PolecatPeekTarget | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [nukeTarget, setNukeTarget] = useState<NukeTarget | null>(null);
	const [nukeOpen, setNukeOpen] = useState(false);

	const fleetQuery = useGastownFleet({ enabled: true });
	const polecats = fleetQuery.data ?? [];
	const rigs = useMemo(() => groupByRig(polecats), [polecats]);

	return (
		<div className="border-t border-border/60 px-2 py-2">
			<Collapsible open={open} onOpenChange={setOpen}>
				<div className="flex items-center justify-between gap-2 px-2 py-1">
					<CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
						{open ? (
							<HiChevronDown className="size-3" />
						) : (
							<HiChevronRight className="size-3" />
						)}
						<span>Gas Town</span>
						{polecats.length > 0 && (
							<span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
								{polecats.length}
							</span>
						)}
					</CollapsibleTrigger>
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						onClick={() => fleetQuery.refetch()}
						disabled={fleetQuery.isFetching}
						aria-label="Refresh Gas Town fleet"
					>
						<HiOutlineArrowPath
							className={`size-3.5 ${fleetQuery.isFetching ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
				<CollapsibleContent className="mt-1 space-y-2">
					{fleetQuery.error ? (
						<div className="px-2 text-xs text-destructive">
							Gas Town unavailable.
							<Button
								variant="link"
								size="sm"
								className="ml-1 h-auto p-0 text-xs"
								onClick={() => fleetQuery.refetch()}
							>
								Retry
							</Button>
						</div>
					) : fleetQuery.isLoading ? (
						<p className="px-2 text-xs text-muted-foreground">Loading fleet…</p>
					) : rigs.length === 0 ? (
						<p className="px-2 text-xs text-muted-foreground">
							No polecats yet. Sling work via New Workspace modal.
						</p>
					) : (
						rigs.map((rig) => (
							<RigGroup
								key={rig.name}
								rig={rig.name}
								polecats={rig.polecats}
								onPeek={(p) => {
									setTarget({ rig: p.rig, name: p.name, state: p.state });
									setDrawerOpen(true);
								}}
								onNuke={(p) => {
									setNukeTarget({ rig: p.rig, name: p.name });
									setNukeOpen(true);
								}}
							/>
						))
					)}
				</CollapsibleContent>
			</Collapsible>
			<PolecatPeekDrawer
				target={target}
				open={drawerOpen}
				onOpenChange={(next) => {
					setDrawerOpen(next);
					if (!next) setTarget(null);
				}}
			/>
			<NukeConfirmDialog
				target={nukeTarget}
				open={nukeOpen}
				onOpenChange={(next) => {
					setNukeOpen(next);
					if (!next) setNukeTarget(null);
				}}
			/>
		</div>
	);
}

interface RigGroupProps {
	rig: string;
	polecats: Polecat[];
	onPeek: (polecat: Polecat) => void;
	onNuke: (polecat: Polecat) => void;
}

function RigGroup({ rig, polecats, onPeek, onNuke }: RigGroupProps) {
	const [open, setOpen] = useState(true);
	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger className="flex w-full items-center gap-1 px-2 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground">
				{open ? (
					<HiChevronDown className="size-3" />
				) : (
					<HiChevronRight className="size-3" />
				)}
				<span className="truncate">{rig}</span>
				<span className="ml-auto text-[10px] text-muted-foreground">
					{polecats.length}
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-0.5 pl-3">
				{polecats.map((polecat) => (
					<PolecatRow
						key={`${polecat.rig}/${polecat.name}`}
						polecat={polecat}
						onPeek={() => onPeek(polecat)}
						onNuke={() => onNuke(polecat)}
					/>
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

interface RigGrouping {
	name: string;
	polecats: Polecat[];
}

function groupByRig(polecats: Polecat[]): RigGrouping[] {
	const byRig = new Map<string, Polecat[]>();
	for (const polecat of polecats) {
		const existing = byRig.get(polecat.rig);
		if (existing) {
			existing.push(polecat);
		} else {
			byRig.set(polecat.rig, [polecat]);
		}
	}
	return Array.from(byRig.entries())
		.map(([name, list]) => ({
			name,
			polecats: [...list].sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
