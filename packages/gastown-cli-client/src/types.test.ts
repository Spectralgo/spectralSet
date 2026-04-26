import { describe, expect, it } from "bun:test";
import { convoyArraySchema, convoyStatusSchema } from "./types";

describe("convoyStatusSchema", () => {
	it("parses `gt convoy status --json` output without created_at", () => {
		const statusJson = {
			id: "hq-cv-p3uni",
			title: "Wave R-2",
			status: "open",
			tracked: [
				{
					id: "ss-gwzs",
					title: "card",
					status: "open",
					dependency_type: "tracks",
					issue_type: "task",
				},
			],
			completed: 0,
			total: 1,
		};

		expect(() => convoyStatusSchema.parse(statusJson)).not.toThrow();
	});

	it("still accepts created_at when present", () => {
		const parsed = convoyStatusSchema.parse({
			id: "hq-cv-p3uni",
			title: "Wave R-2",
			status: "open",
			created_at: "2026-04-19T20:25:18Z",
			tracked: [],
		});
		expect(parsed.created_at).toBe("2026-04-19T20:25:18Z");
	});

	it("list-side schema still rejects missing created_at (regression)", () => {
		const listEntryWithoutCreatedAt = {
			id: "hq-cv-p3uni",
			title: "Wave R-2",
			status: "open",
			tracked: [],
		};
		expect(() =>
			convoyArraySchema.parse([listEntryWithoutCreatedAt]),
		).toThrow();
	});
});
