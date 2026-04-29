import { describe, expect, it, mock } from "bun:test";
import type { Convoy, ConvoyStatus } from "@spectralset/gastown-cli-client";
import { renderToStaticMarkup } from "react-dom/server";

interface UseQueryFake<T> {
	data: T | undefined;
	isLoading: boolean;
	error: unknown;
	isFetching?: boolean;
	refetch?: () => unknown;
}

let listState: UseQueryFake<Convoy[]> = {
	data: [],
	isLoading: false,
	error: null,
};
let statusState: UseQueryFake<ConvoyStatus> = {
	data: undefined,
	isLoading: false,
	error: null,
};
let lastStatusInput: { id: string } | undefined;

mock.module("renderer/lib/electron-trpc", () => ({
	electronTrpc: {
		gastown: {
			convoys: {
				list: { useQuery: () => listState },
				status: {
					useQuery: (input: { id: string }) => {
						lastStatusInput = input;
						return statusState;
					},
				},
			},
		},
	},
}));

mock.module("@spectralset/ui/sonner", () => ({
	toast: { success: () => {}, error: () => {} },
}));

mock.module("@tanstack/react-router", () => ({
	useNavigate: () => () => {},
}));

const { ConvoyBoard } = await import("./ConvoyBoard");

describe("ConvoyBoard", () => {
	it("renders empty and error states", () => {
		listState = { data: [], isLoading: false, error: null };
		expect(renderToStaticMarkup(<ConvoyBoard />)).toContain(
			"No active sprints found.",
		);

		listState = { data: undefined, isLoading: false, error: new Error("x") };
		expect(renderToStaticMarkup(<ConvoyBoard />)).toContain(
			"Failed to load sprints",
		);
	});

	it("renders sprint list, auto-selects first sprint, fetches detail, derives progress", () => {
		const convoy: Convoy = {
			id: "cv-9",
			title: "SS-4 epic",
			status: "in_progress",
			created_at: "2026-04-19T20:00:00Z",
			completed: undefined,
			total: undefined,
			tracked: [
				{
					id: "ss-1",
					title: "Lay rails",
					status: "closed",
					dependency_type: "required",
					issue_type: "task",
				},
				{
					id: "ss-2",
					title: "Paint cars",
					status: "open",
					dependency_type: "related",
					issue_type: "bug",
				},
			],
		};
		listState = { data: [convoy], isLoading: false, error: null };
		statusState = { data: convoy, isLoading: false, error: null };

		const html = renderToStaticMarkup(<ConvoyBoard />);
		expect(html).toContain("Sprints");
		expect(html).toContain("Sprint planning for tracked issues.");
		expect(html).toContain("1 active sprint found");
		expect(html).toContain("Refresh");
		expect(html).toContain("Sprint summary");
		expect(html).toContain("Open issue board");
		expect(html).toContain("Issues");
		expect(html).toContain("Open");
		expect(html).toContain("Done");
		expect(html).toContain("Issue");
		expect(html).toContain("Relation");
		expect(html).toContain("SS-4 epic");
		expect(html).toContain("In progress");
		expect(html).toContain("cv-9");
		expect(html).toContain("1/2");
		expect(html).toContain("ss-1");
		expect(html).toContain("Lay rails");
		expect(html).toContain("ss-2");
		expect(html).toContain("Paint cars");
		expect(lastStatusInput?.id).toBe("cv-9");
	});

	it("renders tracked table empty state", () => {
		const convoy: Convoy = {
			id: "cv-empty",
			title: "Empty",
			status: "open",
			created_at: "2026-04-19T20:00:00Z",
			tracked: [],
		};
		listState = { data: [convoy], isLoading: false, error: null };
		statusState = { data: convoy, isLoading: false, error: null };
		expect(renderToStaticMarkup(<ConvoyBoard />)).toContain("No issues yet.");
	});

	it("names unresolved tracked issue references instead of rendering blank status columns", () => {
		const convoy: Convoy = {
			id: "cv-missing",
			title: "Sparse sprint",
			status: "open",
			created_at: "2026-04-19T20:00:00Z",
			tracked: [
				{
					id: "ss-missing",
					title: "",
					status: "",
					dependency_type: "tracks",
					issue_type: "",
				},
			],
		};
		listState = { data: [convoy], isLoading: false, error: null };
		statusState = { data: convoy, isLoading: false, error: null };

		const html = renderToStaticMarkup(<ConvoyBoard />);
		expect(html).toContain("1 active sprint found");
		expect(html).toContain("Uncategorized");
		expect(html).toContain("Issue details unavailable");
		expect(html).toContain("Unknown type");
		expect(html).toContain("tracks");
	});
});
