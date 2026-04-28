import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { MailMessage } from "renderer/lib/gastown/mail-types";

interface UseQueryFake<T> {
	data: T | undefined;
	isLoading: boolean;
	error: unknown;
}

let inboxState: UseQueryFake<MailMessage[]> = {
	data: [],
	isLoading: false,
	error: null,
};
const probeState: UseQueryFake<{ rigs: Array<{ name: string }> }> = {
	data: { rigs: [] },
	isLoading: false,
	error: null,
};

mock.module("renderer/lib/electron-trpc", () => ({
	electronTrpc: {
		gastown: {
			mail: {
				inbox: {
					useQuery: () => inboxState,
				},
			},
			probe: {
				useQuery: () => probeState,
			},
		},
	},
}));

mock.module("@spectralset/ui/sonner", () => ({
	toast: { success: () => {}, error: () => {} },
}));

const { MailPanel } = await import("./MailPanel");
const ComposeDialogStub = () => null;

function makeMessage(overrides: Partial<MailMessage> = {}): MailMessage {
	return {
		id: "mail-1",
		from: "mayor/",
		to: "spectralSet/witness",
		subject: "Status update",
		body: "All polecats green.",
		timestamp: "2026-04-19T20:00:00Z",
		read: false,
		priority: "normal",
		type: "notification",
		...overrides,
	};
}

describe("MailPanel", () => {
	it("renders an empty-state when inbox is empty", () => {
		inboxState = { data: [], isLoading: false, error: null };
		const html = renderToStaticMarkup(
			<MailPanel ComposeDialogComponent={ComposeDialogStub} />,
		);
		expect(html).toContain("Inbox is empty.");
		expect(html).toContain("Select a message to read.");
	});

	it("shows loading state", () => {
		inboxState = { data: undefined, isLoading: true, error: null };
		const html = renderToStaticMarkup(
			<MailPanel ComposeDialogComponent={ComposeDialogStub} />,
		);
		expect(html).toContain("Loading…");
	});

	it("shows an error state when the query fails", () => {
		inboxState = {
			data: undefined,
			isLoading: false,
			error: new Error("boom"),
		};
		const html = renderToStaticMarkup(
			<MailPanel ComposeDialogComponent={ComposeDialogStub} />,
		);
		expect(html).toContain("Failed to load inbox");
	});

	it("renders the inbox list and auto-selects the first message", () => {
		inboxState = {
			data: [
				makeMessage({ id: "m1", subject: "First", priority: "urgent" }),
				makeMessage({
					id: "m2",
					subject: "Second",
					from: "spectralSet/refinery",
					read: true,
				}),
			],
			isLoading: false,
			error: null,
		};
		const html = renderToStaticMarkup(
			<MailPanel ComposeDialogComponent={ComposeDialogStub} />,
		);
		expect(html).toContain("First");
		expect(html).toContain("Second");
		expect(html).toContain("All polecats green.");
		expect(html).toContain("urgent");
		expect(html).toContain("mayor/");
		expect(html).toContain("spectralSet/refinery");
	});

	it("falls back to '(no subject)' for empty subjects", () => {
		inboxState = {
			data: [makeMessage({ subject: "" })],
			isLoading: false,
			error: null,
		};
		const html = renderToStaticMarkup(
			<MailPanel ComposeDialogComponent={ComposeDialogStub} />,
		);
		expect(html).toContain("(no subject)");
	});
});
