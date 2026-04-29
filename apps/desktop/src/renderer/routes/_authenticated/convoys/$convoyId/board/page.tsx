import type { ConvoyBead } from "@spectralset/gastown-cli-client";
import { toast } from "@spectralset/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@spectralset/ui/toggle-group";
import { createFileRoute } from "@tanstack/react-router";
import {
	BeadCard,
	type BeadStatus,
	ConvoyBoardShell,
	type ConvoyBead as ShellBead,
} from "renderer/components/Gastown/ConvoyBoard";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
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

	const townPath = useGastownTownPath() || undefined;
	const utils = electronTrpc.useUtils();
	const beadsQuery = electronTrpc.gastown.convoys.beads.useQuery({
		convoyId,
		townPath,
	});
	const updateBeadStatus =
		electronTrpc.gastown.convoys.updateBeadStatus.useMutation({
			onMutate: async (input) => {
				const queryInput = {
					convoyId: input.convoyId,
					townPath: input.townPath,
				};
				await utils.gastown.convoys.beads.cancel(queryInput);
				const previous = utils.gastown.convoys.beads.getData(queryInput);
				utils.gastown.convoys.beads.setData(queryInput, (current) =>
					current
						? {
								...current,
								beads: current.beads.map((bead) =>
									bead.id === input.beadId
										? { ...bead, status: input.status }
										: bead,
								),
							}
						: current,
				);
				return { previous, queryInput };
			},
			onError: (_error, _input, context) => {
				if (context?.previous) {
					utils.gastown.convoys.beads.setData(
						context.queryInput,
						context.previous,
					);
				}
				toast.error("Failed to update issue status");
			},
			onSettled: async (_data, _error, input) => {
				await Promise.all([
					utils.gastown.convoys.beads.invalidate({
						convoyId: input?.convoyId ?? convoyId,
						townPath: input?.townPath ?? townPath,
					}),
					utils.gastown.convoys.status.invalidate({
						id: input?.convoyId ?? convoyId,
						townPath: input?.townPath ?? townPath,
					}),
					utils.gastown.convoys.list.invalidate(),
				]);
			},
		});
	const beads = (beadsQuery.data?.beads ?? []) as unknown as ShellBead[];
	const handleStatusChange = (beadId: string, status: BeadStatus) => {
		updateBeadStatus.mutate({ convoyId, beadId, status, townPath });
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
				<div>
					<div className="text-[11px] font-medium uppercase text-muted-foreground">
						Sprint board
					</div>
					<h1 className="font-mono text-sm">{convoyId}</h1>
				</div>
				<ToggleGroup
					type="single"
					size="sm"
					value={mode}
					onValueChange={(v) => v && setMode(v as BoardMode)}
					className="ml-auto"
				>
					<ToggleGroupItem value="kanban">Board</ToggleGroupItem>
					<ToggleGroupItem value="stream">Stream</ToggleGroupItem>
				</ToggleGroup>
			</header>
			{beadsQuery.isLoading ? (
				<div className="p-4 text-xs text-muted-foreground">Loading issues…</div>
			) : beadsQuery.error ? (
				<div className="p-4 text-xs text-destructive">
					Failed to load sprint issues.
				</div>
			) : (
				<ConvoyBoardShell
					beads={beads}
					dependencies={beadsQuery.data?.dependencies ?? []}
					onStatusChange={handleStatusChange}
					renderCard={(b) => <BeadCard bead={b as unknown as ConvoyBead} />}
				/>
			)}
		</div>
	);
}
