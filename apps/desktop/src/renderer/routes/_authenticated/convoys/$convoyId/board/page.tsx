import type { ConvoyBead } from "@spectralset/gastown-cli-client";
import { ToggleGroup, ToggleGroupItem } from "@spectralset/ui/toggle-group";
import { createFileRoute } from "@tanstack/react-router";
import {
	BeadCard,
	ConvoyBoardShell,
	type ConvoyBead as ShellBead,
} from "renderer/components/Gastown/ConvoyBoard";
import { electronTrpc } from "renderer/lib/electron-trpc";

type BoardMode = "kanban" | "stream";
interface ConvoyBoardSearch {
	mode: BoardMode;
	bead?: string;
}

export const Route = createFileRoute(
	"/_authenticated/convoys/$convoyId/board/",
)({
	validateSearch: (search: Record<string, unknown>): ConvoyBoardSearch => ({
		mode: search.mode === "stream" ? "stream" : "kanban",
		bead: typeof search.bead === "string" ? search.bead : undefined,
	}),
	component: ConvoyBoardPage,
});

function ConvoyBoardPage() {
	const { convoyId } = Route.useParams();
	const { mode } = Route.useSearch();
	const navigate = Route.useNavigate();
	const setMode = (next: BoardMode) =>
		navigate({ search: (p) => ({ ...p, mode: next }), replace: true });

	const beadsQuery = electronTrpc.gastown.convoys.beads.useQuery({ convoyId });
	const beads = (beadsQuery.data?.beads ?? []) as unknown as ShellBead[];

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
				<h1 className="font-mono text-sm">{convoyId}</h1>
				<ToggleGroup
					type="single"
					size="sm"
					value={mode}
					onValueChange={(v) => v && setMode(v as BoardMode)}
					className="ml-auto"
				>
					<ToggleGroupItem value="kanban">Kanban</ToggleGroupItem>
					<ToggleGroupItem value="stream">Stream</ToggleGroupItem>
				</ToggleGroup>
			</header>
			{beadsQuery.isLoading ? (
				<div className="p-4 text-xs text-muted-foreground">Loading beads…</div>
			) : beadsQuery.error ? (
				<div className="p-4 text-xs text-destructive">
					Failed to load beads.
				</div>
			) : (
				<ConvoyBoardShell
					beads={beads}
					onStatusChange={() => {}}
					renderCard={(b) => <BeadCard bead={b as unknown as ConvoyBead} />}
				/>
			)}
		</div>
	);
}
