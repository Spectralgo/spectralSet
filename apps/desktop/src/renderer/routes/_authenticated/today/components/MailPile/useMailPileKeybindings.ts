import { useEffect } from "react";

export interface MailPileKeybindingsArgs {
	enabled: boolean;
	expanded: boolean;
	onToggle: () => void;
	onBulkArchive: () => void;
	onMarkAllRead: () => void;
}

export type PileKey = "toggle" | "bulk-archive" | "mark-all-read" | null;

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditableTarget(target: EventTarget | null): boolean {
	if (target === null || typeof target !== "object") return false;
	const el = target as { tagName?: unknown; isContentEditable?: unknown };
	if (typeof el.tagName === "string" && INPUT_TAGS.has(el.tagName)) return true;
	return el.isContentEditable === true;
}

export function classifyPileKey(e: KeyboardEvent, expanded: boolean): PileKey {
	if (e.metaKey || e.ctrlKey || e.altKey) return null;
	if (isEditableTarget(e.target)) return null;
	const k = e.key.toLowerCase();
	if (k === "e") return "toggle";
	if (!expanded) return null;
	if (k === "x") return "bulk-archive";
	if (k === "r") return "mark-all-read";
	return null;
}

export function useMailPileKeybindings(args: MailPileKeybindingsArgs): void {
	const { enabled, expanded, onToggle, onBulkArchive, onMarkAllRead } = args;
	useEffect(() => {
		if (!enabled) return;
		const actions = {
			toggle: onToggle,
			"bulk-archive": onBulkArchive,
			"mark-all-read": onMarkAllRead,
		} as const;
		const handler = (e: KeyboardEvent) => {
			const a = classifyPileKey(e, expanded);
			if (a === null) return;
			e.preventDefault();
			actions[a]();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [enabled, expanded, onToggle, onBulkArchive, onMarkAllRead]);
}
