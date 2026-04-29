import { describe, expect, it, mock } from "bun:test";

mock.module("renderer/lib/electron-trpc", () => ({
	electronTrpc: {
		gastown: {
			convoys: {
				list: { useQuery: () => ({ data: [], isLoading: false, error: null }) },
				status: {
					useQuery: () => ({ data: undefined, isLoading: false, error: null }),
				},
			},
			beads: {
				detail: {
					useQuery: () => ({ data: undefined, isLoading: false, error: null }),
				},
			},
		},
	},
}));

mock.module("@spectralset/ui/sonner", () => ({
	toast: { success: () => {}, error: () => {} },
}));

const { statusLabel } = await import("./ConvoyBoard");

describe("statusLabel", () => {
	it("maps known statuses to human-readable labels", () => {
		expect(statusLabel("open")).toBe("Open");
		expect(statusLabel("in_progress")).toBe("In progress");
		expect(statusLabel("closed")).toBe("Done");
		expect(statusLabel("blocked")).toBe("Blocked");
		expect(statusLabel("hooked")).toBe("Hooked");
	});

	it("falls back to Unknown · <raw> for unmapped values", () => {
		expect(statusLabel("stranded")).toBe("Unknown · stranded");
	});

	it("labels empty/falsy raw values as uncategorized", () => {
		expect(statusLabel("")).toBe("Uncategorized");
	});
});
