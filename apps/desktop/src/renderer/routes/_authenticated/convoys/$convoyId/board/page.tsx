import { ToggleGroup, ToggleGroupItem } from "@spectralset/ui/toggle-group";
import { createFileRoute } from "@tanstack/react-router";

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
	const { mode, bead } = Route.useSearch();
	const navigate = Route.useNavigate();
	const setMode = (next: BoardMode) =>
		navigate({ search: (p) => ({ ...p, mode: next }), replace: true });

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
			<div className="min-h-0 flex-1 p-4 text-xs text-muted-foreground">
				Mode: {mode}
				{bead ? ` · Selected: ${bead}` : ""}
			</div>
		</div>
	);
}
