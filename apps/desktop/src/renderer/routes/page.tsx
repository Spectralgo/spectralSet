import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: RootIndexPage,
});

function RootIndexPage() {
	// Boot lands on /workspaces (the dashboard shell with sidebar) so Gas Town
	// nav and Workspaces nav are always reachable. /today is still the canonical
	// cockpit but is reached via sidebar — direct boot to /today traps the user
	// because /today is a full-screen route outside _dashboard (no sidebar).
	// Wave A pane migration will fold /today into _dashboard as a pane and this
	// redirect can target /today again then.
	return <Navigate to="/workspaces" replace />;
}
