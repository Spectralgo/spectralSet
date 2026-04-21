import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TriageCard } from "./TriageCard";

describe("TriageCard", () => {
	it("renders the incident variant with severity chip and A/O/S buttons in order", () => {
		const html = renderToStaticMarkup(
			<TriageCard
				kind="incident"
				severity="HIGH"
				title="Polecat granite escalated"
				meta="spectralSet · 4m ago"
			/>,
		);

		expect(html).toContain('data-kind="incident"');
		expect(html).toContain('data-severity="HIGH"');
		expect(html).toContain("HIGH");
		expect(html).toContain("Polecat granite escalated");
		expect(html).toContain("spectralSet · 4m ago");

		const ackIdx = html.indexOf(">Ack<");
		const openIdx = html.indexOf(">Open<");
		const snoozeIdx = html.indexOf(">Snooze<");
		expect(ackIdx).toBeGreaterThan(-1);
		expect(openIdx).toBeGreaterThan(ackIdx);
		expect(snoozeIdx).toBeGreaterThan(openIdx);
	});

	it("renders the rejection variant with the REJECT cause chip", () => {
		const html = renderToStaticMarkup(
			<TriageCard
				kind="rejection"
				severity="REJECT"
				title="Build failed on rebase"
				meta="polecat opal · spectralChat · 12m ago"
			/>,
		);

		expect(html).toContain('data-kind="rejection"');
		expect(html).toContain("REJECT");
		expect(html).toContain("amber");
	});

	it("renders the pinned-mail variant with envelope glyph instead of severity chip", () => {
		const html = renderToStaticMarkup(
			<TriageCard
				kind="pinned-mail"
				severity="PINNED"
				title="Mayor: weekly digest"
				meta="mayor/ · 1h ago"
			/>,
		);

		expect(html).toContain('data-kind="pinned-mail"');
		expect(html).toContain('aria-hidden="true"');
		expect(html).not.toMatch(/aria-label="Severity PINNED"/);
	});

	it("renders the acked state with timestamp and visible Undo affordance", () => {
		const html = renderToStaticMarkup(
			<TriageCard
				kind="incident"
				severity="HIGH"
				title="Already acked"
				meta="spectralSet · just now"
				ackedAt="9:14am"
			/>,
		);

		expect(html).toContain('data-state="acked"');
		expect(html).toContain("Acked · 9:14am");
		expect(html).toMatch(/Undo · 6s/);
		expect(html).not.toContain(">Ack<");
		expect(html).not.toContain(">Snooze<");
	});

	it("applies the CRITICAL pulse class but respects motion-reduce", () => {
		const html = renderToStaticMarkup(
			<TriageCard
				kind="incident"
				severity="CRITICAL"
				title="Dolt unreachable"
				meta="local · 2s ago"
			/>,
		);

		expect(html).toContain("animate-pulse");
		expect(html).toContain("motion-reduce:animate-none");
	});
});
