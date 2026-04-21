import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type DigestPayload,
	formatClockTime,
	formatRelative,
	TodayMasthead,
} from "./TodayMasthead";

const anchor = new Date(2026, 3, 21, 23, 4, 0);
const sinceTime = anchor.toISOString();
const now = new Date(anchor.getTime() + 14_000);
const base = { lastVerifiedAt: anchor, isStale: false, now } as const;
const r = (
	p: Partial<Parameters<typeof TodayMasthead>[0]> & {
		digest: DigestPayload | undefined;
	},
) => renderToStaticMarkup(<TodayMasthead {...base} {...p} />);
const digest = (m: number, a: number, e: number, p: number): DigestPayload => ({
	sinceTime,
	mergedCount: m,
	awaitingReviewCount: a,
	escalationsAckedCount: e,
	polecatsAliveCount: p,
});

describe("helpers", () => {
	const t = new Date("2026-04-21T12:00:00Z");
	const b = (ms: number) => new Date(t.getTime() - ms);
	it("formatRelative thresholds", () => {
		expect(formatRelative(b(3_000), t)).toBe("just now");
		expect(formatRelative(b(30_000), t)).toBe("30s ago");
		expect(formatRelative(b(60_000), t)).toBe("1m ago");
		expect(formatRelative(b(59 * 60_000), t)).toBe("59m ago");
		expect(formatRelative(b(60 * 60_000), t)).toBe("1h ago");
		expect(formatRelative(new Date(t.getTime() + 10_000), t)).toBe("just now");
	});
	it("formatClockTime 12h lowercase padded", () => {
		expect(formatClockTime(new Date(2026, 3, 21, 0, 0))).toBe("12:00am");
		expect(formatClockTime(new Date(2026, 3, 21, 12, 0))).toBe("12:00pm");
		expect(formatClockTime(new Date(2026, 3, 21, 23, 4))).toBe("11:04pm");
	});
});

describe("TodayMasthead copy variants", () => {
	it("first-launch (undefined digest, null verified)", () => {
		const h = r({ digest: undefined, lastVerifiedAt: null });
		expect(h).toContain("Today");
		expect(h).toContain("Welcome back. Fetching overnight…");
		expect(h).not.toContain("Last verified");
	});
	it("first-launch flag + last-verified relative", () => {
		const h = r({ digest: { firstLaunch: true } });
		expect(h).toContain("Welcome back. Fetching overnight…");
		expect(h).toContain("Last verified 14s ago");
	});
	it("populated since-you-slept line", () => {
		expect(r({ digest: digest(12, 3, 1, 8) })).toContain(
			"Since 11:04pm: 12 merged · 3 awaiting review · 1 escalations acked · 8 alive",
		);
	});
	it("zero-overnight copy when all counts zero", () => {
		expect(r({ digest: digest(0, 0, 0, 0) })).toContain(
			"Since 11:04pm: nothing landed. All agents held.",
		);
	});
	it("stale-since absolute replaces relative", () => {
		const h = r({ digest: { firstLaunch: true }, isStale: true });
		expect(h).toContain("Stale since 11:04pm");
		expect(h).not.toContain("Last verified");
	});
});
