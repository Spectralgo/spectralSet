import { useSyncExternalStore } from "react";

export const GASTOWN_TOWN_PATH_STORAGE_KEY = "gastown.townPath";
const CHANGE_EVENT = "gastown.townPath.changed";

function readRaw(): string {
	if (typeof window === "undefined") return "";
	try {
		return window.localStorage.getItem(GASTOWN_TOWN_PATH_STORAGE_KEY) ?? "";
	} catch {
		return "";
	}
}

function subscribe(callback: () => void): () => void {
	window.addEventListener(CHANGE_EVENT, callback);
	window.addEventListener("storage", callback);
	return () => {
		window.removeEventListener(CHANGE_EVENT, callback);
		window.removeEventListener("storage", callback);
	};
}

export function normalizeTownPath(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	return trimmed.replace(/\/+$/, "");
}

/**
 * Returns the user's Gas Town path override, or `""` when unset.
 * Reactive: re-renders when `setGastownTownPath` is called from anywhere
 * in the renderer or when localStorage changes in another window.
 */
export function useGastownTownPath(): string {
	const raw = useSyncExternalStore(subscribe, readRaw, () => "");
	return normalizeTownPath(raw);
}

export function setGastownTownPath(value: string): void {
	if (typeof window === "undefined") return;
	const cleaned = value.trim();
	if (cleaned) {
		window.localStorage.setItem(GASTOWN_TOWN_PATH_STORAGE_KEY, cleaned);
	} else {
		window.localStorage.removeItem(GASTOWN_TOWN_PATH_STORAGE_KEY);
	}
	window.dispatchEvent(new Event(CHANGE_EVENT));
}
