import { describe, expect, it } from "bun:test";
import {
	cardSource,
	cardTitle,
	formatAge,
	type TriageCard,
} from "./TriageStack";
import { classifyTriageKey, isEditableTarget } from "./useTriageKeybindings";

const incident = (
	over: Partial<Extract<TriageCard, { type: "incident" }>> = {},
) => ({
	type: "incident" as const,
	id: "hq-wisp-i1",
	severity: "HIGH" as const,
	title: "Auth subsystem down",
	sourceAddress: "spectralSet/witness",
	ageMs: 60_000,
	...over,
});

const rejection = (
	over: Partial<Extract<TriageCard, { type: "rejection" }>> = {},
) => ({
	type: "rejection" as const,
	id: "hq-wisp-r1",
	severity: "REJECT" as const,
	title: "MR rejected: tests failed",
	rig: "spectralSet",
	polecat: "jade",
	ageMs: 120_000,
	...over,
});

const pinned = (
	over: Partial<Extract<TriageCard, { type: "pinned-mail" }>> = {},
) => ({
	type: "pinned-mail" as const,
	id: "hq-wisp-p1",
	severity: "PINNED" as const,
	sender: "mayor/",
	subject: "Decision needed",
	ageMs: 5_000,
	...over,
});

describe("formatAge", () => {
	it("matches spec-today thresholds", () => {
		expect(formatAge(3_000)).toBe("just now");
		expect(formatAge(30_000)).toBe("30s ago");
		expect(formatAge(60_000)).toBe("1m ago");
		expect(formatAge(59 * 60_000)).toBe("59m ago");
		expect(formatAge(60 * 60_000)).toBe("1h ago");
		expect(formatAge(23 * 3600_000)).toBe("23h ago");
		expect(formatAge(24 * 3600_000)).toBe("1d ago");
	});
	it("clamps negative ages to just now", () => {
		expect(formatAge(-1_000)).toBe("just now");
	});
});

describe("Today route query ownership", () => {
	const repoRoot = `${import.meta.dir}/../../../../../../../../..`;
	const readRendererFile = (path: string) =>
		Bun.file(`${repoRoot}/${path}`).text();
	const count = (source: string, needle: string) =>
		source.split(needle).length - 1;

	it("hoists mail and triage queries once, deriving rigs from probe", async () => {
		const page = await readRendererFile(
			"apps/desktop/src/renderer/routes/_authenticated/today/page.tsx",
		);
		const todayPane = await readRendererFile(
			"apps/desktop/src/renderer/components/Gastown/TodayPane/TodayPane.tsx",
		);
		const triageStack = await readRendererFile(
			"apps/desktop/src/renderer/routes/_authenticated/today/components/TriageStack/TriageStack.tsx",
		);

		expect(count(page, "electronTrpc.gastown.listRigs.useQuery")).toBe(0);
		expect(count(todayPane, "electronTrpc.gastown.listRigs.useQuery")).toBe(0);
		expect(count(page, "electronTrpc.gastown.mail.inbox.useQuery")).toBe(1);
		expect(count(page, "electronTrpc.gastown.today.triage.useQuery")).toBe(1);
		expect(page).toContain("probe?.rigs");
		expect(todayPane).toContain("probe?.rigs");
		expect(triageStack).not.toContain(
			"electronTrpc.gastown.today.triage.useQuery",
		);
	});

	it("dispatches Ack/Snooze/Open through real mutations (no local Set)", async () => {
		const triageStack = await readRendererFile(
			"apps/desktop/src/renderer/routes/_authenticated/today/components/TriageStack/TriageStack.tsx",
		);
		expect(triageStack).toContain("today.ackCard.useMutation");
		expect(triageStack).toContain("today.snoozeCard.useMutation");
		expect(triageStack).toContain("today.openCard.useMutation");
		expect(triageStack).toContain("useNavigate");
		expect(triageStack).not.toContain("setDismissed");
	});
});

describe("cardTitle", () => {
	it("uses title for incidents and rejections", () => {
		expect(cardTitle(incident())).toBe("Auth subsystem down");
		expect(cardTitle(rejection())).toBe("MR rejected: tests failed");
	});
	it("uses subject for pinned-mail with empty fallback", () => {
		expect(cardTitle(pinned())).toBe("Decision needed");
		expect(cardTitle(pinned({ subject: "" }))).toBe("(no subject)");
	});
});

describe("cardSource", () => {
	it("renders source per card type", () => {
		expect(cardSource(incident())).toBe("spectralSet/witness");
		expect(cardSource(rejection())).toBe("spectralSet/jade");
		expect(cardSource(rejection({ rig: null, polecat: null }))).toBe("—");
		expect(cardSource(pinned())).toBe("mayor/");
	});
});

function keyEvent(
	key: string,
	opts: { target?: EventTarget | null; meta?: boolean; ctrl?: boolean } = {},
): KeyboardEvent {
	return {
		key,
		metaKey: opts.meta ?? false,
		ctrlKey: opts.ctrl ?? false,
		altKey: false,
		shiftKey: false,
		target: opts.target ?? null,
	} as unknown as KeyboardEvent;
}

describe("classifyTriageKey", () => {
	it("maps j/k to down/up (case-insensitive)", () => {
		expect(classifyTriageKey(keyEvent("j"))).toBe("down");
		expect(classifyTriageKey(keyEvent("J"))).toBe("down");
		expect(classifyTriageKey(keyEvent("k"))).toBe("up");
		expect(classifyTriageKey(keyEvent("K"))).toBe("up");
	});
	it("maps A/O/S to ack/open/snooze (case-insensitive)", () => {
		expect(classifyTriageKey(keyEvent("a"))).toBe("ack");
		expect(classifyTriageKey(keyEvent("A"))).toBe("ack");
		expect(classifyTriageKey(keyEvent("o"))).toBe("open");
		expect(classifyTriageKey(keyEvent("S"))).toBe("snooze");
	});
	it("ignores presses with modifier keys (avoid hijacking Cmd-K / Cmd-A)", () => {
		expect(classifyTriageKey(keyEvent("a", { meta: true }))).toBeNull();
		expect(classifyTriageKey(keyEvent("k", { ctrl: true }))).toBeNull();
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
		expect(classifyTriageKey(keyEvent("a", { target: input }))).toBeNull();
		expect(classifyTriageKey(keyEvent("j", { target: editable }))).toBeNull();
	});
	it("returns null for unrelated keys", () => {
		expect(classifyTriageKey(keyEvent("x"))).toBeNull();
		expect(classifyTriageKey(keyEvent("Enter"))).toBeNull();
	});
});

describe("isEditableTarget", () => {
	it("returns false for null and non-HTMLElement targets", () => {
		expect(isEditableTarget(null)).toBe(false);
		expect(isEditableTarget({} as EventTarget)).toBe(false);
	});
});
