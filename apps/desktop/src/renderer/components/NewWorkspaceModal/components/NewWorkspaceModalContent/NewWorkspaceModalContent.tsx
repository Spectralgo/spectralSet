import { Tabs, TabsContent, TabsList, TabsTrigger } from "@spectralset/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useCloseNewWorkspaceModal } from "renderer/stores/new-workspace-modal";
import { useNewWorkspaceModalDraft } from "../../NewWorkspaceModalDraftContext";
import { GastownTab } from "../GastownTab";
import { PromptGroup } from "../PromptGroup";

// Shared key with GastownCard + sidebar so all three read the same cache
// backed by the host-side settings SQLite (not the cloud user API).
const GASTOWN_ENABLED_QUERY_KEY = [
	"electron",
	"settings",
	"gastownEnabled",
] as const;

interface NewWorkspaceModalContentProps {
	isOpen: boolean;
	preSelectedProjectId: string | null;
	onImportRepo: () => Promise<void>;
	onNewProject: () => void;
}

/** Content pane for the New Workspace modal — handles project selection, branch search, and workspace creation. */
export function NewWorkspaceModalContent({
	isOpen,
	preSelectedProjectId,
	onImportRepo,
	onNewProject,
}: NewWorkspaceModalContentProps) {
	const { draft, updateDraft } = useNewWorkspaceModalDraft();
	const closeModal = useCloseNewWorkspaceModal();
	const { data: recentProjects = [], isFetched: areRecentProjectsFetched } =
		electronTrpc.projects.getRecents.useQuery();
	const utils = electronTrpc.useUtils();

	const gastownEnabledQuery = useQuery({
		queryKey: GASTOWN_ENABLED_QUERY_KEY,
		queryFn: () => electronTrpcClient.settings.getGastownEnabled.query(),
	});
	const gastownEnabled = gastownEnabledQuery.data?.enabled ?? false;

	// Refetch branches (and other data) when the modal opens to avoid stale data
	useEffect(() => {
		if (!isOpen) return;
		void utils.projects.getBranches.invalidate();
		void utils.projects.getBranchesLocal.invalidate();
		void utils.projects.searchBranches.invalidate();
	}, [isOpen, utils]);

	const appliedPreSelectionRef = useRef<string | null>(null);

	useEffect(() => {
		if (!isOpen) {
			appliedPreSelectionRef.current = null;
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		if (
			preSelectedProjectId &&
			preSelectedProjectId !== appliedPreSelectionRef.current
		) {
			if (!areRecentProjectsFetched) return;
			const hasPreSelectedProject = recentProjects.some(
				(project) => project.id === preSelectedProjectId,
			);
			if (hasPreSelectedProject) {
				appliedPreSelectionRef.current = preSelectedProjectId;
				if (preSelectedProjectId !== draft.selectedProjectId) {
					updateDraft({ selectedProjectId: preSelectedProjectId });
				}
				return;
			}
		}

		if (!areRecentProjectsFetched) return;

		const hasSelectedProject = recentProjects.some(
			(project) => project.id === draft.selectedProjectId,
		);
		if (!hasSelectedProject) {
			updateDraft({ selectedProjectId: recentProjects[0]?.id ?? null });
		}
	}, [
		draft.selectedProjectId,
		areRecentProjectsFetched,
		isOpen,
		preSelectedProjectId,
		recentProjects,
		updateDraft,
	]);

	const selectedProject = recentProjects.find(
		(project) => project.id === draft.selectedProjectId,
	);

	const workspacePanel = (
		<PromptGroup
			projectId={draft.selectedProjectId}
			selectedProject={selectedProject}
			recentProjects={recentProjects.filter((project) => Boolean(project.id))}
			onSelectProject={(selectedProjectId) =>
				updateDraft({ selectedProjectId })
			}
			onImportRepo={onImportRepo}
			onNewProject={onNewProject}
		/>
	);

	if (!gastownEnabled) {
		return <div className="flex-1 overflow-y-auto">{workspacePanel}</div>;
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<Tabs defaultValue="workspace" className="gap-0">
				<TabsList className="mx-3 mt-3 w-[calc(100%-1.5rem)] justify-start bg-muted/60">
					<TabsTrigger value="workspace">Workspace</TabsTrigger>
					<TabsTrigger value="gastown" className="gap-1.5">
						<span className="font-mono text-[10px] font-semibold tracking-tight">
							GT
						</span>
						Gas Town
					</TabsTrigger>
				</TabsList>
				<TabsContent value="workspace">{workspacePanel}</TabsContent>
				<TabsContent value="gastown">
					<GastownTab onSlung={closeModal} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
