import { describe, expect, test } from "bun:test";
import { createTriageStateStore } from "./triage-state-store";

function memoryDeps(initial: string | null = null) {
	let blob: string | null = initial;
	return {
		read: () => blob,
		write: (data: string) => {
			blob = data;
		},
		current: () => blob,
	};
}

describe("createTriageStateStore", () => {
	test("ack persists and rehydrates", () => {
		const m = memoryDeps();
		const store = createTriageStateStore({
			readFile: m.read,
			writeFile: m.write,
		});
		store.ack("card-1", 1_000);
		expect(store.isHidden("card-1", 2_000)).toBe(true);
		const fresh = createTriageStateStore({
			readFile: m.read,
			writeFile: m.write,
		});
		expect(fresh.isHidden("card-1", 2_000)).toBe(true);
	});

	test("snooze hides until expiry then reveals", () => {
		const m = memoryDeps();
		const store = createTriageStateStore({
			readFile: m.read,
			writeFile: m.write,
		});
		store.snooze("card-1", 10_000);
		expect(store.isHidden("card-1", 5_000)).toBe(true);
		expect(store.isHidden("card-1", 10_001)).toBe(false);
	});

	test("isHidden returns false for unknown cards", () => {
		const store = createTriageStateStore({
			readFile: () => null,
			writeFile: () => {},
		});
		expect(store.isHidden("unknown", 0)).toBe(false);
	});

	test("malformed json falls back to empty state", () => {
		const store = createTriageStateStore({
			readFile: () => "{not json",
			writeFile: () => {},
		});
		expect(store.isHidden("any", 0)).toBe(false);
	});
});
