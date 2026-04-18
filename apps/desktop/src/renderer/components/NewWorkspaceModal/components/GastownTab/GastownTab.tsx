import type { Bead, MergeStrategy } from "@spectralset/gastown-cli-client";
import { Button } from "@spectralset/ui/button";
import { Label } from "@spectralset/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@spectralset/ui/select";
import { toast } from "@spectralset/ui/sonner";
import { Textarea } from "@spectralset/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { BeadPicker } from "./components/BeadPicker";
import { MergeStrategySelect } from "./components/MergeStrategySelect";

interface GastownTabProps {
	onSlung: () => void;
}

const DEFAULT_MERGE_STRATEGY: MergeStrategy = "direct";

export function GastownTab({ onSlung }: GastownTabProps) {
	const { activeHostUrl } = useLocalHostService();

	const rigsQuery = useQuery({
		queryKey: ["host", "gastown", "listRigs", activeHostUrl],
		queryFn: async () => {
			if (!activeHostUrl) return [];
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.listRigs.query();
		},
		enabled: !!activeHostUrl,
		refetchOnWindowFocus: false,
	});

	const [selectedRig, setSelectedRig] = useState<string | null>(null);
	const [selectedBeadId, setSelectedBeadId] = useState<string | null>(null);
	const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(
		DEFAULT_MERGE_STRATEGY,
	);
	const [notes, setNotes] = useState("");

	const rigs = rigsQuery.data ?? [];

	useEffect(() => {
		if (selectedRig) return;
		const first = rigs[0]?.name;
		if (first) setSelectedRig(first);
	}, [rigs, selectedRig]);

	const beadsQuery = useQuery({
		queryKey: [
			"host",
			"gastown",
			"listBeads",
			activeHostUrl,
			selectedRig,
			"open",
		],
		queryFn: async () => {
			if (!activeHostUrl || !selectedRig) return [];
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.listBeads.query({
				rig: selectedRig,
				status: "open",
			});
		},
		enabled: !!activeHostUrl && !!selectedRig,
		refetchOnWindowFocus: false,
	});

	const beads = beadsQuery.data ?? [];
	const openBeads = useMemo(() => beads.filter(isSlingableBead), [beads]);

	const handleRigChange = (next: string) => {
		setSelectedRig(next);
		setSelectedBeadId(null);
	};

	const slingMutation = useMutation({
		mutationFn: async (input: {
			rig: string;
			bead: string;
			mergeStrategy: MergeStrategy;
			notes?: string;
		}) => {
			if (!activeHostUrl) {
				throw new Error("Host service unavailable");
			}
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.sling.mutate(input);
		},
		onSuccess: (result, variables) => {
			toast.success(`Slung ${variables.bead} to ${result.polecat}`);
			onSlung();
		},
		onError: (err: unknown) => {
			const message =
				err instanceof Error ? err.message : "Failed to sling bead";
			toast.error(message);
		},
	});

	const canSubmit =
		!!selectedRig &&
		!!selectedBeadId &&
		openBeads.some((bead) => bead.id === selectedBeadId) &&
		!slingMutation.isPending;

	const handleSubmit = () => {
		if (!selectedRig || !selectedBeadId) return;
		slingMutation.mutate({
			rig: selectedRig,
			bead: selectedBeadId,
			mergeStrategy,
			notes: notes.trim() ? notes.trim() : undefined,
		});
	};

	return (
		<div className="flex flex-col gap-3 p-3">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="gastown-rig" className="text-xs text-muted-foreground">
					Rig
				</Label>
				<Select
					value={selectedRig ?? undefined}
					onValueChange={handleRigChange}
					disabled={rigsQuery.isLoading || rigs.length === 0}
				>
					<SelectTrigger id="gastown-rig" size="sm" className="w-full">
						<SelectValue
							placeholder={
								rigsQuery.isLoading ? "Loading rigs…" : "Select a rig"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{rigs.map((rig) => (
							<SelectItem key={rig.name} value={rig.name}>
								{rig.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{rigsQuery.error && (
					<p className="text-xs text-destructive">
						Failed to load rigs from Gas Town.
					</p>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs text-muted-foreground">Open beads</Label>
				<BeadPicker
					beads={openBeads}
					selectedId={selectedBeadId}
					onSelect={setSelectedBeadId}
					isLoading={beadsQuery.isLoading && !!selectedRig}
					errorMessage={
						beadsQuery.error ? "Failed to load beads for this rig." : undefined
					}
					emptyMessage={
						selectedRig
							? `No open beads in ${selectedRig}. Create one with \`bd create\` in your terminal.`
							: "Select a rig to see beads."
					}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs text-muted-foreground">Merge strategy</Label>
				<MergeStrategySelect
					value={mergeStrategy}
					onChange={setMergeStrategy}
					disabled={slingMutation.isPending}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label
					htmlFor="gastown-notes"
					className="text-xs text-muted-foreground"
				>
					Notes (optional)
				</Label>
				<Textarea
					id="gastown-notes"
					placeholder="Extra context passed to the polecat on its hook…"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={3}
					className="resize-none text-sm"
					disabled={slingMutation.isPending}
				/>
			</div>

			<div className="flex items-center justify-end gap-2">
				<Button
					type="button"
					size="sm"
					onClick={handleSubmit}
					disabled={!canSubmit}
				>
					{slingMutation.isPending ? "Slinging…" : "Sling"}
				</Button>
			</div>
		</div>
	);
}

function isSlingableBead(bead: Bead): boolean {
	return bead.status === "open" || bead.status === "in_progress";
}
