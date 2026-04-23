import { describe, expect, it, mock } from "bun:test";
import type { AgentDetail } from "@spectralset/gastown-cli-client";
import { renderToStaticMarkup } from "react-dom/server";

interface UseQueryFake<T> {
	data: T | undefined;
	isLoading: boolean;
	error: unknown;
}

let detailState: UseQueryFake<AgentDetail> = {
	data: undefined,
	isLoading: false,
	error: null,
};
const probeState: UseQueryFake<{ tmuxSocket: string | null }> = {
	data: { tmuxSocket: "ss-sock" },
	isLoading: false,
	error: null,
};

mock.module("renderer/lib/electron-trpc", () => ({
	electronTrpc: {
		gastown: {
			agents: {
				get: { useQuery: () => detailState },
			},
			probe: { useQuery: () => probeState },
		},
		terminal: {
			write: { useMutation: () => ({ mutateAsync: async () => undefined }) },
		},
	},
}));

mock.module("renderer/lib/gastown", () => ({
	attachToAgent: async () => ({
		outcome: "created-new" as const,
		tabId: "t",
		paneId: "p",
	}),
	buildTmuxSessionName: (prefix: string, _kind: string, name: string) =>
		`${prefix}-${name}`,
}));

mock.module("renderer/lib/gastown/rig-prefix", () => ({
	getRigPrefix: (rig: string) => (rig === "spectralSet" ? "ss" : rig),
}));

mock.module("renderer/hooks/useCreateOrAttachWithTheme", () => ({
	useCreateOrAttachWithTheme: () => ({ mutateAsync: async () => undefined }),
}));

mock.module("renderer/stores/tabs/store", () => ({
	useTabsStore: Object.assign(
		(selector: (s: unknown) => unknown) =>
			selector({
				addTab: () => ({ tabId: "t", paneId: "p" }),
				setTabAutoTitle: () => {},
				setActiveTab: () => {},
				tabs: [],
				panes: {},
			}),
		{
			getState: () => ({ tabs: [], panes: {} }),
		},
	),
}));

mock.module("@spectralset/ui/sonner", () => ({
	toast: { success: () => {}, error: () => {} },
}));

mock.module("@tanstack/react-router", () => ({
	useParams: () => ({ workspaceId: "ws-1" }),
}));

// Sheet renders children via portal; stub it to render the content inline
// so renderToStaticMarkup can assert on the body.
mock.module("@spectralset/ui/sheet", () => {
	const Passthrough = ({ children }: { children?: unknown }) =>
		children as React.ReactNode;
	return {
		Sheet: ({ children, open }: { children?: unknown; open?: boolean }) =>
			open ? (children as React.ReactNode) : null,
		SheetContent: Passthrough,
		SheetHeader: Passthrough,
		SheetTitle: Passthrough,
		SheetDescription: Passthrough,
	};
});

const { AgentDetailDrawer } = await import("./AgentDetailDrawer");

function makeDetail(overrides: Partial<AgentDetail> = {}): AgentDetail {
	return {
		kind: "polecat",
		name: "jasper",
		address: "spectralSet/polecats/jasper",
		session: "ss-jasper",
		role: "polecat",
		rig: "spectralSet",
		running: true,
		state: "working",
		unreadMail: 2,
		firstSubject: "HELLO",
		agentBeadId: "ss-999",
		hookBead: "ss-3a6",
		activeMr: "mr-abc",
		branch: "polecat/jasper-mo68zja4",
		cleanupStatus: "clean",
		exitType: "done",
		completionTime: "2026-04-19T18:00:00Z",
		recentCompletions: [
			{
				beadId: "ss-e67",
				title: "CV-A data layer",
				closedAt: "2026-04-19T15:00:00Z",
			},
		],
		...overrides,
	};
}

const selection = {
	kind: "polecat" as const,
	rig: "spectralSet",
	name: "jasper",
};

describe("AgentDetailDrawer", () => {
	it("renders loading state", () => {
		detailState = { data: undefined, isLoading: true, error: null };
		const html = renderToStaticMarkup(
			<AgentDetailDrawer
				selected={selection}
				open={true}
				onOpenChange={() => {}}
			/>,
		);
		expect(html).toContain("Loading…");
	});

	it("renders error state", () => {
		detailState = {
			data: undefined,
			isLoading: false,
			error: new Error("boom"),
		};
		const html = renderToStaticMarkup(
			<AgentDetailDrawer
				selected={selection}
				open={true}
				onOpenChange={() => {}}
			/>,
		);
		expect(html).toContain("Failed to load agent");
	});

	it("renders all detail sections", () => {
		detailState = { data: makeDetail(), isLoading: false, error: null };
		const html = renderToStaticMarkup(
			<AgentDetailDrawer
				selected={selection}
				open={true}
				onOpenChange={() => {}}
			/>,
		);
		expect(html).toContain("jasper");
		expect(html).toContain("working");
		expect(html).toContain("Current work");
		expect(html).toContain("ss-3a6");
		expect(html).toContain("mr-abc");
		expect(html).toContain("polecat/jasper-mo68zja4");
		expect(html).toContain("Last completion");
		expect(html).toContain("Recent history");
		expect(html).toContain("ss-e67");
		expect(html).toContain("CV-A data layer");
		expect(html).toContain("Raw metadata");
		expect(html).toContain("Copy session");
		expect(html).toContain("Open in terminal");
	});

	it("hides Last completion and Recent history when empty", () => {
		detailState = {
			data: makeDetail({
				exitType: null,
				completionTime: null,
				recentCompletions: [],
			}),
			isLoading: false,
			error: null,
		};
		const html = renderToStaticMarkup(
			<AgentDetailDrawer
				selected={selection}
				open={true}
				onOpenChange={() => {}}
			/>,
		);
		expect(html).not.toContain("Last completion");
		expect(html).not.toContain("Recent history");
	});
});
