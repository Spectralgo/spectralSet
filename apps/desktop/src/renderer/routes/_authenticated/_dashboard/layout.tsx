import {
	createFileRoute,
	Outlet,
	useLocation,
	useMatchRoute,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { useIsV2CloudEnabled } from "renderer/hooks/useIsV2CloudEnabled";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { DashboardSidebar } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar";
import { ResizablePanel } from "renderer/screens/main/components/ResizablePanel";
import { WorkspaceSidebar } from "renderer/screens/main/components/WorkspaceSidebar";
import { DeleteWorkspaceDialog } from "renderer/screens/main/components/WorkspaceSidebar/WorkspaceListItem/components";
import { useOpenNewWorkspaceModal } from "renderer/stores/new-workspace-modal";
import {
	COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
	DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
	MAX_WORKSPACE_SIDEBAR_WIDTH,
	useWorkspaceSidebarStore,
} from "renderer/stores/workspace-sidebar-state";
import { TopBar } from "./components/TopBar";

export const Route = createFileRoute("/_authenticated/_dashboard")({
	component: DashboardLayout,
});

// _dashboard is a pathless layout that should ONLY render for its own child
// URLs (workspace, workspaces, tasks, etc.). TanStack Router's matcher has
// been observed mounting this layout for sibling routes like /today (see
// ss-tlc), so gate the chrome on a known URL allow-list and render a bare
// Outlet when the URL isn't ours. Adding a new _dashboard child means adding
// its prefix here.
const DASHBOARD_URL_PREFIXES = [
	"/workspace",
	"/workspaces",
	"/tasks",
	"/project",
	"/pending",
	"/v2-workspace",
	"/v2-workspaces",
];

function isDashboardPath(pathname: string): boolean {
	return DASHBOARD_URL_PREFIXES.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
}

function DashboardLayout() {
	console.log("[dashboard-layout] mount", {
		pathname: window.location.hash,
		ts: Date.now(),
	});
	const location = useLocation();
	if (!isDashboardPath(location.pathname)) {
		return <Outlet />;
	}
	return <DashboardLayoutChrome />;
}

function DashboardLayoutChrome() {
	const navigate = useNavigate();
	const openNewWorkspaceModal = useOpenNewWorkspaceModal();
	const { isV2CloudEnabled } = useIsV2CloudEnabled();
	// Get current workspace from route to pre-select project in new workspace modal
	const matchRoute = useMatchRoute();
	const currentWorkspaceMatch = matchRoute({
		to: "/workspace/$workspaceId",
		fuzzy: true,
	});
	const currentWorkspaceId =
		currentWorkspaceMatch !== false ? currentWorkspaceMatch.workspaceId : null;

	const { data: currentWorkspace } = electronTrpc.workspaces.get.useQuery(
		{ id: currentWorkspaceId ?? "" },
		{ enabled: !!currentWorkspaceId },
	);

	const {
		isOpen: isWorkspaceSidebarOpen,
		toggleCollapsed: toggleWorkspaceSidebarCollapsed,
		setOpen: setWorkspaceSidebarOpen,
		width: workspaceSidebarWidth,
		setWidth: setWorkspaceSidebarWidth,
		isResizing: isWorkspaceSidebarResizing,
		setIsResizing: setWorkspaceSidebarIsResizing,
		isCollapsed: isWorkspaceSidebarCollapsed,
	} = useWorkspaceSidebarStore();

	// Global hotkeys for dashboard
	useHotkey("OPEN_SETTINGS", () => navigate({ to: "/settings/account" }));
	useHotkey("SHOW_HOTKEYS", () => navigate({ to: "/settings/keyboard" }));
	useHotkey("TOGGLE_WORKSPACE_SIDEBAR", () => {
		if (!isWorkspaceSidebarOpen) {
			setWorkspaceSidebarOpen(true);
		} else {
			toggleWorkspaceSidebarCollapsed();
		}
	});
	useHotkey("NEW_WORKSPACE", () =>
		openNewWorkspaceModal(currentWorkspace?.projectId),
	);

	const [deleteTarget, setDeleteTarget] = useState<{
		workspaceId: string;
		workspaceName: string;
		workspaceType: "worktree" | "branch";
	} | null>(null);

	useHotkey(
		"CLOSE_WORKSPACE",
		() => {
			if (currentWorkspaceId && currentWorkspace) {
				setDeleteTarget({
					workspaceId: currentWorkspaceId,
					workspaceName: currentWorkspace.name,
					workspaceType: currentWorkspace.type,
				});
			}
		},
		{ enabled: !!currentWorkspaceId },
	);

	return (
		<div className="flex flex-col h-full w-full">
			<TopBar />
			<div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
				{isWorkspaceSidebarOpen && (
					<ResizablePanel
						width={workspaceSidebarWidth}
						onWidthChange={setWorkspaceSidebarWidth}
						isResizing={isWorkspaceSidebarResizing}
						onResizingChange={setWorkspaceSidebarIsResizing}
						minWidth={COLLAPSED_WORKSPACE_SIDEBAR_WIDTH}
						maxWidth={MAX_WORKSPACE_SIDEBAR_WIDTH}
						handleSide="right"
						clampWidth={false}
						onDoubleClickHandle={() =>
							setWorkspaceSidebarWidth(DEFAULT_WORKSPACE_SIDEBAR_WIDTH)
						}
					>
						{isV2CloudEnabled ? (
							<DashboardSidebar isCollapsed={isWorkspaceSidebarCollapsed()} />
						) : (
							<WorkspaceSidebar
								isCollapsed={isWorkspaceSidebarCollapsed()}
								activeProjectId={currentWorkspace?.projectId ?? null}
								activeProjectName={currentWorkspace?.project?.name ?? null}
							/>
						)}
					</ResizablePanel>
				)}
				<div className="flex flex-1 min-h-0 min-w-0">
					<Outlet />
				</div>
				{deleteTarget && (
					<DeleteWorkspaceDialog
						workspaceId={deleteTarget.workspaceId}
						workspaceName={deleteTarget.workspaceName}
						workspaceType={deleteTarget.workspaceType}
						open={true}
						onOpenChange={(open) => {
							if (!open) setDeleteTarget(null);
						}}
					/>
				)}
			</div>
		</div>
	);
}
