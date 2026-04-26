import { describe, expect, it, mock, spyOn } from "bun:test";
import type { AgentSummary } from "@spectralset/gastown-cli-client";
import { renderToStaticMarkup } from "react-dom/server";

interface UseQueryFake<T> {
	data: T | undefined;
	isLoading: boolean;
	error: unknown;
}

let listState: UseQueryFake<AgentSummary[]> = {
	data: [],
	isLoading: false,
	error: null,
};
const detailState: UseQueryFake<unknown> = {
	data: undefined,
	isLoading: false,
	error: null,
};
const probeState: UseQueryFake<{ tmuxSocket: string | null }> = {
	data: { tmuxSocket: null },
	isLoading: false,
	error: null,
};

mock.module("renderer/lib/electron-trpc", () => ({
	electronTrpc: {
		gastown: {
			agents: {
				list: { useQuery: () => listState },
				get: { useQuery: () => detailState },
				sessionState: { useSubscription: () => undefined },
			},
			probe: { useQuery: () => probeState },
		},
		terminal: {
			write: { useMutation: () => ({ mutateAsync: async () => undefined }) },
		},
	},
}));

mock.module("@spectralset/ui/sonner", () => ({
	toast: { success: () => {}, error: () => {} },
}));

mock.module("@tanstack/react-router", () => ({
	useNavigate: () => () => {},
	useParams: () => ({}),
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

const { AgentCVPanel } = await import("./AgentCVPanel");

function makeAgent(overrides: Partial<AgentSummary> = {}): AgentSummary {
	return {
		kind: "polecat",
		name: "jasper",
		address: "spectralSet/polecats/jasper",
		session: "ss-jasper",
		role: "polecat",
		rig: "spectralSet",
		running: true,
		state: "working",
		unreadMail: 0,
		firstSubject: null,
		...overrides,
	};
}

describe("AgentCVPanel", () => {
	it("renders empty state", () => {
		listState = { data: [], isLoading: false, error: null };
		const html = renderToStaticMarkup(<AgentCVPanel />);
		expect(html).toContain("No agents.");
	});

	it("does not log diagnostics during render", () => {
		const logSpy = spyOn(console, "log").mockImplementation(() => {});
		listState = { data: [], isLoading: false, error: null };

		try {
			renderToStaticMarkup(<AgentCVPanel />);
			expect(logSpy).not.toHaveBeenCalled();
		} finally {
			logSpy.mockRestore();
		}
	});

	it("renders loading state", () => {
		listState = { data: undefined, isLoading: true, error: null };
		const html = renderToStaticMarkup(<AgentCVPanel />);
		expect(html).toContain("Loading…");
	});

	it("renders error state", () => {
		listState = { data: undefined, isLoading: false, error: new Error("x") };
		const html = renderToStaticMarkup(<AgentCVPanel />);
		expect(html).toContain("Failed to load agents");
	});

	it("groups agents by kind (top-level) and by rig", () => {
		listState = {
			data: [
				makeAgent({
					kind: "mayor",
					name: "mayor",
					rig: null,
					address: "mayor/",
					role: "mayor",
					state: "idle",
				}),
				makeAgent({ name: "jasper", rig: "spectralSet", state: "working" }),
				makeAgent({
					kind: "witness",
					name: "witness",
					rig: "spectralSet",
					address: "spectralSet/witness",
					role: "witness",
					state: "idle",
				}),
				makeAgent({
					kind: "polecat",
					name: "obsidian",
					rig: "spectralSet",
					address: "spectralSet/polecats/obsidian",
					role: "polecat",
					state: "stalled",
					unreadMail: 3,
				}),
			],
			isLoading: false,
			error: null,
		};
		const html = renderToStaticMarkup(<AgentCVPanel />);
		expect(html).toContain("Mayor");
		expect(html).toContain("spectralSet");
		expect(html).toContain("jasper");
		expect(html).toContain("obsidian");
		expect(html).toContain("witness");
		expect(html).toContain("working");
		// AgentRow now folds gt's stalled/zombie/done into the unified
		// 4-state model (working/idle/budget-locked/stopped); stalled
		// appears as "idle" when running=true, "stopped" otherwise.
		expect(html).toContain("idle");
		expect(html).toContain("3"); // unread mail badge count
	});

	it("renders agent count in header", () => {
		listState = {
			data: [makeAgent(), makeAgent({ name: "b" })],
			isLoading: false,
			error: null,
		};
		const html = renderToStaticMarkup(<AgentCVPanel />);
		expect(html).toContain("Agents");
		// count badge: 2
		expect(html).toMatch(/>2<\/span>/);
	});
});
