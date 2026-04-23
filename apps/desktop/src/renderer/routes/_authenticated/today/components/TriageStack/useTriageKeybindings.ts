import { useEffect } from "react";

export type TriageKey = "down" | "up" | "ack" | "open" | "snooze" | null;

export interface TriageKeybindingsArgs {
	enabled: boolean;
	onMove: (delta: 1 | -1) => void;
	onAck: () => void;
	onOpen: () => void;
	onSnooze: () => void;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditableTarget(target: EventTarget | null): boolean {
	if (target === null || typeof target !== "object") return false;
	const el = target as { tagName?: unknown; isContentEditable?: unknown };
	if (typeof el.tagName === "string" && INPUT_TAGS.has(el.tagName)) return true;
	return el.isContentEditable === true;
}

const KEY_MAP: Record<string, Exclude<TriageKey, null>> = {
	j: "down",
	k: "up",
	a: "ack",
	o: "open",
	s: "snooze",
};

export function classifyTriageKey(e: KeyboardEvent): TriageKey {
	if (e.metaKey || e.ctrlKey || e.altKey) return null;
	if (isEditableTarget(e.target)) return null;
	return KEY_MAP[e.key.toLowerCase()] ?? null;
}

export function useTriageKeybindings(args: TriageKeybindingsArgs): void {
	const { enabled, onMove, onAck, onOpen, onSnooze } = args;
	useEffect(() => {
		if (!enabled) return;
		const dispatch: Record<Exclude<TriageKey, null>, () => void> = {
			down: () => onMove(1),
			up: () => onMove(-1),
			ack: onAck,
			open: onOpen,
			snooze: onSnooze,
		};
		const handler = (e: KeyboardEvent) => {
			const k = classifyTriageKey(e);
			if (k === null) return;
			e.preventDefault();
			dispatch[k]();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [enabled, onMove, onAck, onOpen, onSnooze]);
}
