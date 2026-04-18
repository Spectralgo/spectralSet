import { describe, expect, it } from "bun:test";
import { parseBeadList } from "./beads";

const TWO_BEADS_FIXTURE = `[
  {
    "id": "ss-1kv",
    "title": "GT MVP 5/5: nuke",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "assignee": "spectralSet/polecats/quartz",
    "labels": ["gastown", "mvp"]
  },
  {
    "id": "ss-yi0",
    "title": "Rebrand followup",
    "status": "open",
    "priority": 2,
    "issue_type": "task"
  }
]
`;

const WARNING_PREFIX_FIXTURE = `Warning: /path/.beads has permissions 0755 (recommended: 0700)
[
  {
    "id": "ss-abc",
    "title": "with warning",
    "status": "in_progress",
    "priority": 1,
    "issue_type": "bug"
  }
]
`;

const EMPTY_LIST_FIXTURE = `[]
`;

describe("parseBeadList", () => {
	it("parses an array of bd list --json entries", () => {
		expect(parseBeadList(TWO_BEADS_FIXTURE)).toEqual([
			{
				id: "ss-1kv",
				title: "GT MVP 5/5: nuke",
				status: "open",
				priority: 2,
				type: "task",
				assignee: "spectralSet/polecats/quartz",
				labels: ["gastown", "mvp"],
			},
			{
				id: "ss-yi0",
				title: "Rebrand followup",
				status: "open",
				priority: 2,
				type: "task",
			},
		]);
	});

	it("tolerates stderr-style warnings prepended before the JSON array", () => {
		expect(parseBeadList(WARNING_PREFIX_FIXTURE)).toEqual([
			{
				id: "ss-abc",
				title: "with warning",
				status: "in_progress",
				priority: 1,
				type: "bug",
			},
		]);
	});

	it("returns an empty list for an empty JSON array", () => {
		expect(parseBeadList(EMPTY_LIST_FIXTURE)).toEqual([]);
	});

	it("returns an empty list when no JSON array is present", () => {
		expect(parseBeadList("")).toEqual([]);
		expect(parseBeadList("error: nothing here\n")).toEqual([]);
	});

	it("returns an empty list when the payload is not parseable", () => {
		expect(parseBeadList("[garbage")).toEqual([]);
	});
});
