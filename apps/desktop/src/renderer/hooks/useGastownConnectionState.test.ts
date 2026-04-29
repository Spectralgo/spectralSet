import { describe, expect, it } from "bun:test";
import { deriveConnectionState } from "./useGastownConnectionState";

const NOW = 1_700_000_000_000;

describe("deriveConnectionState", () => {
	it("returns connected when gastown is disabled", () => {
		expect(
			deriveConnectionState({
				enabled: false,
				probeOk: false,
				failureCount: 9,
				lastSeenAt: null,
				now: NOW,
			}),
		).toBe("connected");
	});

	it("returns connected when probe is currently ok", () => {
		expect(
			deriveConnectionState({
				enabled: true,
				probeOk: true,
				failureCount: 0,
				lastSeenAt: NOW,
				now: NOW,
			}),
		).toBe("connected");
	});

	it("returns reconnecting after 1-2 failures with no prior success", () => {
		expect(
			deriveConnectionState({
				enabled: true,
				probeOk: false,
				failureCount: 1,
				lastSeenAt: null,
				now: NOW,
			}),
		).toBe("reconnecting");
		expect(
			deriveConnectionState({
				enabled: true,
				probeOk: false,
				failureCount: 2,
				lastSeenAt: null,
				now: NOW,
			}),
		).toBe("reconnecting");
	});

	it("returns offline after 3+ probe failures", () => {
		expect(
			deriveConnectionState({
				enabled: true,
				probeOk: false,
				failureCount: 3,
				lastSeenAt: NOW - 10_000,
				now: NOW,
			}),
		).toBe("offline");
	});

	it("returns offline after 60s with no successful probe", () => {
		expect(
			deriveConnectionState({
				enabled: true,
				probeOk: false,
				failureCount: 1,
				lastSeenAt: NOW - 60_000,
				now: NOW,
			}),
		).toBe("offline");
	});

	it("stays reconnecting within 60s and below 3 failures", () => {
		expect(
			deriveConnectionState({
				enabled: true,
				probeOk: false,
				failureCount: 1,
				lastSeenAt: NOW - 5_000,
				now: NOW,
			}),
		).toBe("reconnecting");
	});
});
