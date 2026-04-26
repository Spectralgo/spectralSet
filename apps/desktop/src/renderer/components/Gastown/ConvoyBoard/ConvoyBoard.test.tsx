import { describe, expect, it, mock } from "bun:test";
import type { Convoy, ConvoyStatus } from "@spectralset/gastown-cli-client";
import { renderToStaticMarkup } from "react-dom/server";

interface UseQueryFake<T> {
	data: T | undefined;
	isLoading: boolean;
	error: unknown;
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
		expect(renderToStaticMarkup(<ConvoyBoard />)).toContain("No open convoys.");

		listState = { data: undefined, isLoading: false, error: new Error("x") };
		expect(renderToStaticMarkup(<ConvoyBoard />)).toContain(
			"Failed to load convoys",
		);
	});

	it("renders list, auto-selects first convoy, fetches detail, derives progress", () => {
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
		expect(html).toContain("SS-4 epic");
		expect(html).toContain("in_progress");
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
		expect(renderToStaticMarkup(<ConvoyBoard />)).toContain(
			"No tracked issues.",
		);
	});
});
