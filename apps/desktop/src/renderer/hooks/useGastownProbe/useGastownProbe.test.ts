import { describe, expect, it, mock } from "bun:test";

// `useGastownProbe` transitively imports the renderer trpc client, which
// instantiates trpc-electron at module load and explodes outside Electron.
// We test the pure backoff/status helpers here, so stub the client module.
mock.module("renderer/lib/trpc-client", () => ({
	electronTrpcClient: { gastown: { probe: { query: async () => null } } },
}));

const {
	deriveProbeStatus,
	GASTOWN_PROBE_BASE_INTERVAL_MS,
	GASTOWN_PROBE_MAX_INTERVAL_MS,
	GASTOWN_PROBE_QUERY_KEY,
	nextProbeInterval,
} = await import("./useGastownProbe");

describe("nextProbeInterval", () => {
	it("returns the base 10s interval when there are no consecutive failures", () => {
		expect(nextProbeInterval(0)).toBe(10_000);
	});

	it("doubles the interval per consecutive failed poll: 10 → 20 → 40", () => {
		expect(nextProbeInterval(1)).toBe(20_000);
		expect(nextProbeInterval(2)).toBe(40_000);
	});

	it("caps the interval at 60s once the doubling sequence exceeds the cap", () => {
		expect(nextProbeInterval(3)).toBe(60_000);
		expect(nextProbeInterval(10)).toBe(60_000);
	});

	it("treats negative failure counts as base (defensive)", () => {
		expect(nextProbeInterval(-1)).toBe(10_000);
	});
});

describe("deriveProbeStatus", () => {
	it("reports 'connected' when the probe has data and no consecutive failures", () => {
		expect(deriveProbeStatus({ failureCount: 0, hasData: true })).toBe(
			"connected",
		);
	});

	it("reports 'reconnecting' on the first/second consecutive failure", () => {
		expect(deriveProbeStatus({ failureCount: 1, hasData: true })).toBe(
			"reconnecting",
		);
		expect(deriveProbeStatus({ failureCount: 2, hasData: false })).toBe(
			"reconnecting",
		);
	});

	it("flips to 'offline' once we hit the backoff cap (3+ failures)", () => {
		expect(deriveProbeStatus({ failureCount: 3, hasData: true })).toBe(
			"offline",
		);
		expect(deriveProbeStatus({ failureCount: 5, hasData: false })).toBe(
			"offline",
		);
	});

	it("treats 'no failures, no data yet' as still reconnecting (initial load)", () => {
		expect(deriveProbeStatus({ failureCount: 0, hasData: false })).toBe(
			"reconnecting",
		);
	});
});

describe("GASTOWN_PROBE_QUERY_KEY", () => {
	it("is the well-known cache key shared by every probe consumer", () => {
		// Hard-coded so tests fail loudly if anyone changes the key —
		// other surfaces (gastown/layout, AddressPicker etc.) read this
		// cache and would silently double-fetch on a key drift.
		expect(GASTOWN_PROBE_QUERY_KEY).toEqual(["electron", "gastown", "probe"]);
	});

	it("exposes the base + cap intervals as the public backoff contract", () => {
		expect(GASTOWN_PROBE_BASE_INTERVAL_MS).toBe(10_000);
		expect(GASTOWN_PROBE_MAX_INTERVAL_MS).toBe(60_000);
	});
});
