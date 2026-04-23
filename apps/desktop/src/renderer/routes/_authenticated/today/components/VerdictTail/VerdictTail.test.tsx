import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { MailMessage } from "renderer/lib/gastown/mail-types";
import { VerdictTail } from "./VerdictTail";
import {
	deriveVerdict,
	filterMailPile,
	formatNextCheck,
	formatVerdictRelative,
} from "./verdict";

const ANCHOR = new Date("2026-04-22T23:04:00");
const ago = (ms: number) => new Date(ANCHOR.getTime() - ms);

describe("deriveVerdict", () => {
	it("red when any HIGH or CRITICAL triage card is present", () => {
		expect(
			deriveVerdict({
				triageSeverities: ["HIGH"],
				amberRigCount: 0,
				mailPileCount: 0,
			}),
		).toBe("red-suppressed");
		expect(
			deriveVerdict({
				triageSeverities: ["CRITICAL", "PINNED"],
				amberRigCount: 5,
				mailPileCount: 10,
			}),
		).toBe("red-suppressed");
	});
	it("amber when REJECT/PINNED only, or amber rigs, or pile items", () => {
		expect(
			deriveVerdict({
				triageSeverities: ["REJECT"],
				amberRigCount: 0,
				mailPileCount: 0,
			}),
		).toBe("amber-with-plan");
		expect(
			deriveVerdict({
				triageSeverities: ["PINNED"],
				amberRigCount: 0,
				mailPileCount: 0,
			}),
		).toBe("amber-with-plan");
		expect(
			deriveVerdict({
				triageSeverities: [],
				amberRigCount: 1,
				mailPileCount: 0,
			}),
		).toBe("amber-with-plan");
		expect(
			deriveVerdict({
				triageSeverities: [],
				amberRigCount: 0,
				mailPileCount: 1,
			}),
		).toBe("amber-with-plan");
	});
	it("green when nothing is open", () => {
		expect(
			deriveVerdict({
				triageSeverities: [],
				amberRigCount: 0,
				mailPileCount: 0,
			}),
		).toBe("all-green");
	});
	it("red outranks amber regardless of other signals", () => {
		expect(
			deriveVerdict({
				triageSeverities: ["CRITICAL", "REJECT"],
				amberRigCount: 3,
				mailPileCount: 99,
			}),
		).toBe("red-suppressed");
	});
});

describe("formatVerdictRelative", () => {
	it("matches spec-today thresholds", () => {
		expect(formatVerdictRelative(ago(3_000), ANCHOR)).toBe("just now");
		expect(formatVerdictRelative(ago(30_000), ANCHOR)).toBe("30s ago");
		expect(formatVerdictRelative(ago(60_000), ANCHOR)).toBe("1m ago");
		expect(formatVerdictRelative(ago(59 * 60_000), ANCHOR)).toBe("59m ago");
		expect(formatVerdictRelative(ago(60 * 60_000), ANCHOR)).toBe("1h ago");
		expect(formatVerdictRelative(ago(5 * 3600_000), ANCHOR)).toBe("5h ago");
	});
	it("never returns a negative age for future timestamps", () => {
		expect(
			formatVerdictRelative(new Date(ANCHOR.getTime() + 60_000), ANCHOR),
		).toBe("just now");
	});
});

describe("formatNextCheck", () => {
	it("renders 12-hour clock with am/pm and zero-padded minutes", () => {
		const d = (iso: string) => new Date(iso);
		expect(formatNextCheck(d("2026-04-22T23:04:00"))).toBe("11:04pm");
		expect(formatNextCheck(d("2026-04-22T00:00:00"))).toBe("12:00am");
		expect(formatNextCheck(d("2026-04-22T12:00:00"))).toBe("12:00pm");
		expect(formatNextCheck(d("2026-04-22T13:05:00"))).toBe("1:05pm");
		expect(formatNextCheck(d("2026-04-22T09:09:00"))).toBe("9:09am");
	});
});

describe("filterMailPile", () => {
	const m = (overrides: Partial<MailMessage> = {}): MailMessage => ({
		id: "x",
		from: "a",
		to: "b",
		subject: "s",
		body: "",
		timestamp: ANCHOR.toISOString(),
		read: false,
		priority: "normal",
		type: "notification",
		...overrides,
	});
	it("drops urgent and high (those feed the triage stack)", () => {
		const inbox = [
			m({ id: "1", priority: "normal" }),
			m({ id: "2", priority: "low" }),
			m({ id: "3", priority: "high" }),
			m({ id: "4", priority: "urgent" }),
		];
		const out = filterMailPile(inbox).map((x) => x.id);
		expect(out).toEqual(["1", "2"]);
	});
	it("treats undefined inbox as empty", () => {
		expect(filterMailPile(undefined)).toEqual([]);
	});
});

describe("VerdictTail rendering", () => {
	it("renders the all-green copy with last-verified relative", () => {
		const html = renderToStaticMarkup(
			<VerdictTail
				state="all-green"
				lastVerifiedAt={ago(14_000)}
				now={ANCHOR}
			/>,
		);
		expect(html).toContain("Everything is fine. Last verified 14s ago.");
		expect(html).toContain('data-state="all-green"');
	});
	it("renders the amber-with-plan copy with next-check clock", () => {
		const html = renderToStaticMarkup(
			<VerdictTail state="amber-with-plan" now={ANCHOR} nextCheckInMs={0} />,
		);
		expect(html).toContain("All attended. Next check 11:04pm.");
		expect(html).toContain('data-state="amber-with-plan"');
	});
	it("renders nothing when red (the triage stack is the tail)", () => {
		expect(renderToStaticMarkup(<VerdictTail state="red-suppressed" />)).toBe(
			"",
		);
	});
	it("renders a loading placeholder when loading", () => {
		const html = renderToStaticMarkup(
			<VerdictTail state="all-green" loading />,
		);
		expect(html).toContain('data-state="loading"');
		expect(html).toContain("Checking");
	});
	it("degrades silently to an em-dash on error", () => {
		const html = renderToStaticMarkup(<VerdictTail state="all-green" error />);
		expect(html).toContain('data-state="error"');
		expect(html).toContain("—");
	});
	it("falls back to 'just now' when lastVerifiedAt is missing", () => {
		const html = renderToStaticMarkup(
			<VerdictTail state="all-green" now={ANCHOR} />,
		);
		expect(html).toContain("Last verified just now.");
	});
});
