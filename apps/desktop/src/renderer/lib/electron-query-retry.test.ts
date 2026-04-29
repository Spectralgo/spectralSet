import { describe, expect, it } from "bun:test";
import {
	createGastownToastCoalescer,
	GASTOWN_TOAST_ID,
	isGastownQueryKey,
	MAX_RETRIES,
	nextRetryDelay,
	RETRY_BASE_MS,
	RETRY_CAP_MS,
	shouldRetryQuery,
} from "./electron-query-retry";

describe("shouldRetryQuery", () => {
	it("retries up to MAX_RETRIES attempts", () => {
		expect(shouldRetryQuery(0, new Error("net"))).toBe(true);
		expect(shouldRetryQuery(MAX_RETRIES - 1, new Error("net"))).toBe(true);
	});

	it("stops once MAX_RETRIES attempts have been made", () => {
		expect(shouldRetryQuery(MAX_RETRIES, new Error("net"))).toBe(false);
		expect(shouldRetryQuery(MAX_RETRIES + 5, new Error("net"))).toBe(false);
	});
});

describe("nextRetryDelay", () => {
	it("doubles the base interval per attempt: 10s → 20s → 40s", () => {
		expect(nextRetryDelay(0)).toBe(RETRY_BASE_MS);
		expect(nextRetryDelay(1)).toBe(20_000);
		expect(nextRetryDelay(2)).toBe(40_000);
	});

	it("caps the delay at 60s once the doubling sequence exceeds the cap", () => {
		expect(nextRetryDelay(3)).toBe(RETRY_CAP_MS);
		expect(nextRetryDelay(10)).toBe(RETRY_CAP_MS);
	});
});

describe("isGastownQueryKey", () => {
	it("matches tRPC-shaped procedure paths", () => {
		expect(isGastownQueryKey([["gastown", "probe"], { type: "query" }])).toBe(
			true,
		);
		expect(isGastownQueryKey([["gastown", "convoys", "list"]])).toBe(true);
	});

	it("matches flat react-query keys", () => {
		expect(isGastownQueryKey(["gastown", "probe"])).toBe(true);
	});

	it("rejects non-gastown keys (settings, workspaces, etc.)", () => {
		expect(isGastownQueryKey([["settings", "getGastownEnabled"]])).toBe(false);
		expect(isGastownQueryKey(["workspaces", "list"])).toBe(false);
		expect(isGastownQueryKey([])).toBe(false);
	});
});

describe("createGastownToastCoalescer", () => {
	function fakeToast() {
		const calls: Array<{
			kind: "error" | "success";
			msg: string;
			id?: string;
		}> = [];
		return {
			calls,
			sink: {
				error: (msg: string, opts?: { id: string }) => {
					calls.push({ kind: "error", msg, id: opts?.id });
				},
				success: (msg: string, opts?: { id: string }) => {
					calls.push({ kind: "success", msg, id: opts?.id });
				},
			},
		};
	}

	it("routes every gastown error through one shared toast id (sonner dedupes in place)", () => {
		const t = fakeToast();
		const c = createGastownToastCoalescer(t.sink);
		c.onQueryError([["gastown", "probe"]]);
		c.onQueryError([["gastown", "convoys", "list"]]);
		c.onQueryError([["gastown", "today", "digest"]]);
		expect(t.calls).toHaveLength(3);
		expect(
			t.calls.every(
				(call) =>
					call.kind === "error" &&
					call.msg === "Reconnecting…" &&
					call.id === GASTOWN_TOAST_ID,
			),
		).toBe(true);
		expect(c.isFailing()).toBe(true);
	});

	it("ignores non-gastown query errors so unrelated failures don't surface as 'Reconnecting'", () => {
		const t = fakeToast();
		const c = createGastownToastCoalescer(t.sink);
		c.onQueryError([["settings", "getGastownEnabled"]]);
		expect(t.calls).toHaveLength(0);
		expect(c.isFailing()).toBe(false);
	});

	it("fires 'Reconnected' once when a gastown query succeeds after a failure window", () => {
		const t = fakeToast();
		const c = createGastownToastCoalescer(t.sink);
		c.onQueryError([["gastown", "probe"]]);
		c.onQuerySuccess([["gastown", "probe"]]);
		expect(c.isFailing()).toBe(false);
		expect(t.calls.at(-1)).toMatchObject({
			kind: "success",
			msg: "Reconnected",
			id: GASTOWN_TOAST_ID,
		});
	});

	it("stays silent on success when nothing was failing (no false 'Reconnected')", () => {
		const t = fakeToast();
		const c = createGastownToastCoalescer(t.sink);
		c.onQuerySuccess([["gastown", "probe"]]);
		c.onQuerySuccess([["gastown", "convoys", "list"]]);
		expect(t.calls).toHaveLength(0);
	});

	it("emits exactly one 'Reconnected' until the next failure cycle starts", () => {
		const t = fakeToast();
		const c = createGastownToastCoalescer(t.sink);
		c.onQueryError([["gastown", "probe"]]);
		c.onQuerySuccess([["gastown", "probe"]]);
		c.onQuerySuccess([["gastown", "convoys", "list"]]);
		const successes = t.calls.filter((call) => call.kind === "success");
		expect(successes).toHaveLength(1);
	});
});
