import { describe, expect, it } from "bun:test";
import type { MailMessage } from "renderer/lib/gastown/mail-types";
import { formatPileRelative, pileRowCopy } from "./MailPile";
import { classifyPileKey, isEditableTarget } from "./useMailPileKeybindings";

const ANCHOR = new Date("2026-04-22T12:00:00Z");
const ago = (ms: number) => new Date(ANCHOR.getTime() - ms);

const msg = (overrides: Partial<MailMessage> = {}): MailMessage => ({
	id: "hq-wisp-aaaa",
	from: "spectralSet/witness",
	to: "mayor/",
	subject: "patrol run",
	body: "",
	timestamp: ago(10 * 60_000).toISOString(),
	read: true,
	priority: "normal",
	type: "notification",
	...overrides,
});

describe("formatPileRelative", () => {
	it("matches spec-today relative thresholds", () => {
		expect(formatPileRelative(ago(3_000), ANCHOR)).toBe("just now");
		expect(formatPileRelative(ago(30_000), ANCHOR)).toBe("30s ago");
		expect(formatPileRelative(ago(60_000), ANCHOR)).toBe("1m ago");
		expect(formatPileRelative(ago(59 * 60_000), ANCHOR)).toBe("59m ago");
		expect(formatPileRelative(ago(60 * 60_000), ANCHOR)).toBe("1h ago");
		expect(formatPileRelative(ago(23 * 3600_000), ANCHOR)).toBe("23h ago");
		expect(formatPileRelative(ago(24 * 3600_000), ANCHOR)).toBe("1d ago");
	});
	it("never returns a negative age for future timestamps", () => {
		const future = new Date(ANCHOR.getTime() + 60_000);
		expect(formatPileRelative(future, ANCHOR)).toBe("just now");
	});
});

describe("pileRowCopy", () => {
	it("formats `<sender> · <subject> · <relative>` per spec-today §3", () => {
		expect(pileRowCopy(msg({ subject: "patrol run" }), ANCHOR)).toBe(
			"spectralSet/witness · patrol run · 10m ago",
		);
	});
	it("falls back to `(no subject)` when subject is empty", () => {
		expect(pileRowCopy(msg({ subject: "" }), ANCHOR)).toContain("(no subject)");
	});
	it("renders the raw timestamp when unparseable (no silent crash)", () => {
		const m = msg({ timestamp: "not-a-date" });
		expect(pileRowCopy(m, ANCHOR)).toBe(
			"spectralSet/witness · patrol run · not-a-date",
		);
	});
});

function keyEvent(
	key: string,
	opts: { target?: EventTarget | null; meta?: boolean; shift?: boolean } = {},
): KeyboardEvent {
	return {
		key,
		metaKey: opts.meta ?? false,
		ctrlKey: false,
		altKey: false,
		shiftKey: opts.shift ?? false,
		target: opts.target ?? null,
	} as unknown as KeyboardEvent;
}

describe("classifyPileKey", () => {
	it("maps E to toggle regardless of expanded state", () => {
		expect(classifyPileKey(keyEvent("e"), false)).toBe("toggle");
		expect(classifyPileKey(keyEvent("E"), true)).toBe("toggle");
	});
	it("gates X and R behind expanded=true per plan §2 hard gate", () => {
		expect(classifyPileKey(keyEvent("x"), false)).toBeNull();
		expect(classifyPileKey(keyEvent("r"), false)).toBeNull();
		expect(classifyPileKey(keyEvent("x"), true)).toBe("bulk-archive");
		expect(classifyPileKey(keyEvent("R"), true)).toBe("mark-all-read");
	});
	it("ignores presses with modifier keys (avoid hijacking Cmd-K / Cmd-R)", () => {
		expect(classifyPileKey(keyEvent("e", { meta: true }), false)).toBeNull();
		expect(classifyPileKey(keyEvent("r", { meta: true }), true)).toBeNull();
	});
	it("ignores presses on input/textarea/contenteditable targets", () => {
		const input = {
			tagName: "INPUT",
			isContentEditable: false,
		} as unknown as EventTarget;
		const editable = {
			tagName: "DIV",
			isContentEditable: true,
		} as unknown as EventTarget;
		expect(classifyPileKey(keyEvent("e", { target: input }), false)).toBeNull();
		expect(
			classifyPileKey(keyEvent("x", { target: editable }), true),
		).toBeNull();
	});
});

describe("isEditableTarget", () => {
	it("returns false for null and non-HTMLElement targets", () => {
		expect(isEditableTarget(null)).toBe(false);
		expect(isEditableTarget({} as EventTarget)).toBe(false);
	});
});
