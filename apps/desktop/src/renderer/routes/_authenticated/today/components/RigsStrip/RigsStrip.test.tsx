import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { type RigStripRow, RigsStrip } from "./RigsStrip";
import {
	type RigDotState,
	type RigReason,
	reasonDotState,
	reasonTemplate,
} from "./reasonTemplate";

const cases: Array<[RigReason, string, RigDotState]> = [
	[{ kind: "quiet" }, "all quiet", "working"],
	[
		{ kind: "stalled", duration: "3h", readyCount: 0 },
		"stalled polecat 3h · 0 ready work",
		"stalled",
	],
	[
		{ kind: "ready", p0Count: 4, refineryState: "idle" },
		"4 P0 ready · refinery idle",
		"working",
	],
	[{ kind: "zombie", count: 2 }, "2 zombie · needs ack", "zombie"],
	[
		{ kind: "offline", lastSeenRelative: "2m ago" },
		"unreachable · last seen 2m ago",
		"zombie",
	],
];

describe("reasonTemplate / reasonDotState", () => {
	it("templates all five spec-today §3 variants and maps §4 dot-state", () => {
		for (const [reason, text, dot] of cases) {
			expect(reasonTemplate(reason)).toBe(text);
			expect(reasonDotState(reason)).toBe(dot);
		}
	});
});

describe("RigsStrip", () => {
	it("returns null for an empty rigs list (parent owns empty-state copy)", () => {
		expect(renderToStaticMarkup(<RigsStrip rigs={[]} />)).toBe("");
	});

	it("renders a typographic row per rig with name, reason, and dot-state", () => {
		const rigs: RigStripRow[] = cases.map(([reason], i) => ({
			name: `rig-${i}`,
			reason,
		}));
		const html = renderToStaticMarkup(<RigsStrip rigs={rigs} />);
		for (const [, text] of cases) expect(html).toContain(text);
		for (const dot of ["working", "stalled", "zombie"]) {
			expect(html).toContain(`data-state="${dot}"`);
		}
		expect(html).toContain("✕");
	});
});
