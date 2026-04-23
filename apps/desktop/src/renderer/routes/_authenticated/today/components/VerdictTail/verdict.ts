import type { MailMessage } from "renderer/lib/gastown/mail-types";

export type VerdictState = "all-green" | "amber-with-plan" | "red-suppressed";

export type TriageSeverity = "HIGH" | "CRITICAL" | "REJECT" | "PINNED";

export function deriveVerdict(input: {
	triageSeverities: readonly TriageSeverity[];
	amberRigCount: number;
	mailPileCount: number;
}): VerdictState {
	const hasRed = input.triageSeverities.some(
		(s) => s === "HIGH" || s === "CRITICAL",
	);
	if (hasRed) return "red-suppressed";
	const hasAmber =
		input.triageSeverities.length > 0 ||
		input.amberRigCount > 0 ||
		input.mailPileCount > 0;
	if (hasAmber) return "amber-with-plan";
	return "all-green";
}

export function formatVerdictRelative(from: Date, now: Date): string {
	const d = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
	if (d <= 5) return "just now";
	if (d <= 59) return `${d}s ago`;
	if (d <= 3599) return `${Math.floor(d / 60)}m ago`;
	return `${Math.floor(d / 3600)}h ago`;
}

export function formatNextCheck(at: Date): string {
	const hours = at.getHours();
	const minutes = at.getMinutes();
	const h12 = hours % 12 === 0 ? 12 : hours % 12;
	const m = minutes.toString().padStart(2, "0");
	return `${h12}:${m}${hours < 12 ? "am" : "pm"}`;
}

export function filterMailPile(
	inbox: readonly MailMessage[] | undefined,
): readonly MailMessage[] {
	return (inbox ?? []).filter(
		(m) => m.priority !== "urgent" && m.priority !== "high",
	);
}
