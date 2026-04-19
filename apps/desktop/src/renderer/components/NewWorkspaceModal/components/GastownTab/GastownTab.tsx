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
import { Textarea } from "@spectralset/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useGastownSling } from "renderer/hooks/useGastownSling";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useNewWorkspaceModalDraft } from "../../NewWorkspaceModalDraftContext";
import { BeadPicker } from "./components/BeadPicker";
import { MergeStrategySelect } from "./components/MergeStrategySelect";

interface GastownTabProps {
	onSlung: () => void;
}

const DEFAULT_MERGE_STRATEGY: MergeStrategy = "mr";
const MERGE_STRATEGY_STORAGE_KEY = "gastown.lastMergeStrategy";
const VALID_MERGE_STRATEGIES: readonly MergeStrategy[] = [
	"direct",
	"mr",
	"local",
] as const;

function loadInitialMergeStrategy(): MergeStrategy {
	if (typeof window === "undefined") return DEFAULT_MERGE_STRATEGY;
	const stored = window.localStorage.getItem(MERGE_STRATEGY_STORAGE_KEY);
	if (
		stored &&
		(VALID_MERGE_STRATEGIES as readonly string[]).includes(stored)
	) {
		return stored as MergeStrategy;
	}
	return DEFAULT_MERGE_STRATEGY;
}

export function GastownTab({ onSlung }: GastownTabProps) {
	const townPath = useGastownTownPath();
	const { draft } = useNewWorkspaceModalDraft();
	const rigsQuery = useQuery({
		queryKey: ["electron", "gastown", "listRigs", townPath],
		queryFn: () =>
			electronTrpcClient.gastown.listRigs.query(
				townPath ? { townPath } : undefined,
			),
		refetchOnWindowFocus: false,
	});

	const [selectedRig, setSelectedRig] = useState<string | null>(null);
	const [selectedBeadId, setSelectedBeadId] = useState<string | null>(null);
	const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(
		loadInitialMergeStrategy,
	);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(MERGE_STRATEGY_STORAGE_KEY, mergeStrategy);
	}, [mergeStrategy]);

	const rigs = rigsQuery.data ?? [];

	useEffect(() => {
		if (selectedRig) return;
		const first = rigs[0]?.name;
		if (first) setSelectedRig(first);
	}, [rigs, selectedRig]);

	const beadsQuery = useQuery({
		queryKey: [
			"electron",
			"gastown",
			"listBeads",
			selectedRig,
			"open",
			townPath,
		],
		queryFn: async () => {
			if (!selectedRig) return [];
			return await electronTrpcClient.gastown.listBeads.query({
				rig: selectedRig,
				status: "open",
				...(townPath ? { townPath } : {}),
			});
		},
		enabled: !!selectedRig,
		refetchOnWindowFocus: false,
	});

	const beads = beadsQuery.data ?? [];
	const openBeads = useMemo(() => beads.filter(isSlingableBead), [beads]);

	const handleRigChange = (next: string) => {
		setSelectedRig(next);
		setSelectedBeadId(null);
	};

	const {
		sling,
		retry,
		phase,
		polecatName,
		isPending: slingPending,
	} = useGastownSling({
		projectId: draft.selectedProjectId,
		townPath,
		onComplete: onSlung,
	});

	const canSubmit =
		!!selectedRig &&
		!!selectedBeadId &&
		!!draft.selectedProjectId &&
		openBeads.some((bead) => bead.id === selectedBeadId) &&
		!slingPending;

	const handleSubmit = () => {
		if (!selectedRig || !selectedBeadId) return;
		void sling({
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
					disabled={slingPending}
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
					disabled={slingPending}
				/>
			</div>

			{phase !== "idle" && (
				<SlingProgress phase={phase} polecatName={polecatName} />
			)}

			{!draft.selectedProjectId && (
				<p className="text-xs text-destructive">
					Select a project in the Workspace tab before slinging.
				</p>
			)}

			<div className="flex items-center justify-end gap-2">
				{phase === "warning" && (
					<Button type="button" variant="outline" size="sm" onClick={retry}>
						Retry reconcile
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					onClick={handleSubmit}
					disabled={!canSubmit}
				>
					{slingPending ? "Slinging…" : "Sling"}
				</Button>
			</div>
		</div>
	);
}

function isSlingableBead(bead: Bead): boolean {
	return bead.status === "open" || bead.status === "in_progress";
}

interface SlingProgressProps {
	phase: Exclude<ReturnType<typeof useGastownSling>["phase"], "idle">;
	polecatName: string | null;
}

function SlingProgress({ phase, polecatName }: SlingProgressProps) {
	const allocStatus: StepStatus =
		phase === "slinging" ? "active" : phase === "error" ? "error" : "done";
	const reconcileStatus: StepStatus =
		phase === "reconciling"
			? "active"
			: phase === "slinging"
				? "pending"
				: phase === "error" || phase === "warning"
					? phase === "warning"
						? "warning"
						: "error"
					: "done";
	const switchStatus: StepStatus =
		phase === "switching"
			? "active"
			: phase === "done"
				? "done"
				: phase === "error"
					? "error"
					: "pending";

	return (
		<div className="rounded border border-border/60 bg-muted/30 px-2 py-1.5 text-xs">
			<ProgressRow
				label={
					polecatName
						? `Allocated polecat ${polecatName}`
						: "Allocating polecat slot"
				}
				status={allocStatus}
			/>
			<ProgressRow label="Indexing worktree" status={reconcileStatus} />
			<ProgressRow label="Switching to workspace" status={switchStatus} />
		</div>
	);
}

type StepStatus = "pending" | "active" | "done" | "warning" | "error";

function ProgressRow({ label, status }: { label: string; status: StepStatus }) {
	const icon =
		status === "done"
			? "✓"
			: status === "active"
				? "…"
				: status === "warning"
					? "⚠"
					: status === "error"
						? "✗"
						: "·";
	const color =
		status === "done"
			? "text-green-600 dark:text-green-400"
			: status === "error"
				? "text-destructive"
				: status === "warning"
					? "text-yellow-600 dark:text-yellow-400"
					: status === "active"
						? "text-foreground"
						: "text-muted-foreground";
	return (
		<div className="flex items-center gap-1.5">
			<span className={`w-3 text-center font-mono ${color}`}>{icon}</span>
			<span className={color}>{label}</span>
		</div>
	);
}
