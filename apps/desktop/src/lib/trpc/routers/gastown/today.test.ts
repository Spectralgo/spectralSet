import { describe, expect, test } from "bun:test";
import type {
	AgentSummary,
	MailMessage,
} from "@spectralset/gastown-cli-client";
import { createGastownTodayRouter } from "./today";
import { createTriageStateStore } from "./triage-state-store";

function memoryStore(initial: string | null = null) {
	let blob: string | null = initial;
	return createTriageStateStore({
		readFile: () => blob,
		writeFile: (data) => {
			blob = data;
		},
	});
}

function agent(
	overrides: Partial<AgentSummary> & Pick<AgentSummary, "kind" | "state">,
): AgentSummary {
	return {
		name: "test",
		address: "rig/role",
		session: "",
		role: "test",
		rig: null,
		running: true,
		unreadMail: 0,
		firstSubject: null,
		...overrides,
	};
}

function mail(overrides: Partial<MailMessage>): MailMessage {
	return {
		id: "m1",
		from: "mayor/",
		to: "spectralSet/witness",
		subject: "hello",
		body: "",
		timestamp: new Date().toISOString(),
		read: false,
		priority: "normal",
		type: "notification",
		...overrides,
	};
}

describe("gastownToday.digest", () => {
	test("returns firstLaunch when sinceTime is missing", async () => {
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [],
			listInboxFn: async () => [],
			resolveTownPathFn: () => undefined,
		});
		const result = await router.createCaller({}).digest();
		expect(result).toEqual({ firstLaunch: true });
	});

	test("counts working polecats as alive", async () => {
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [
				agent({ kind: "polecat", state: "working" }),
				agent({ kind: "polecat", state: "stalled" }),
				agent({ kind: "polecat", state: "working" }),
				agent({ kind: "witness", state: "working" }),
			],
			listInboxFn: async () => [],
			resolveTownPathFn: () => undefined,
		});
		const result = await router
			.createCaller({})
			.digest({ sinceTime: "2026-04-21T23:00:00Z" });
		expect(result).toMatchObject({
			sinceTime: "2026-04-21T23:00:00Z",
			polecatsAliveCount: 2,
			mergedCount: 0,
			awaitingReviewCount: 0,
			escalationsAckedCount: 0,
		});
	});

	test("returns sinceTime shape with zero polecats when gas town unreachable", async () => {
		const router = createGastownTodayRouter({
			listAgentsFn: async () => {
				throw new Error("boom");
			},
			listInboxFn: async () => [],
			resolveTownPathFn: () => undefined,
		});
		const result = await router
			.createCaller({})
			.digest({ sinceTime: "2026-04-21T23:00:00Z" });
		expect(result).toMatchObject({ polecatsAliveCount: 0 });
	});
});

describe("gastownToday.triage", () => {
	test("returns empty cards when gas town unreachable", async () => {
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [],
			listInboxFn: async () => {
				throw new Error("boom");
			},
			resolveTownPathFn: () => undefined,
		});
		const result = await router.createCaller({}).triage();
		expect(result).toEqual({ cards: [] });
	});

	test("classifies and sorts escalation, rejection, and pinned cards", async () => {
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [],
			listInboxFn: async () => [
				mail({
					id: "esc-high",
					subject: "HIGH: polecat stalled",
					type: "escalation",
					priority: "high",
					timestamp: new Date(Date.now() - 10_000).toISOString(),
					from: "spectralSet/witness",
				}),
				mail({
					id: "esc-crit",
					subject: "Dolt server unreachable",
					type: "escalation",
					priority: "urgent",
					timestamp: new Date(Date.now() - 20_000).toISOString(),
					from: "spectralSet/witness",
				}),
				mail({
					id: "rej-1",
					subject: "REJECT: ss-7mt build passed locally",
					type: "reply",
					priority: "high",
					timestamp: new Date(Date.now() - 30_000).toISOString(),
					from: "spectralSet/refinery/jasper",
				}),
				mail({
					id: "pin-1",
					subject: "Review the Phase-B bundle",
					type: "task",
					priority: "urgent",
					timestamp: new Date(Date.now() - 5_000).toISOString(),
					from: "mayor/",
				}),
				mail({
					id: "skip-low",
					priority: "normal",
					type: "notification",
				}),
			],
			resolveTownPathFn: () => undefined,
		});
		const { cards } = await router.createCaller({}).triage();
		expect(cards.map((c) => c.id)).toEqual([
			"esc-crit",
			"esc-high",
			"rej-1",
			"pin-1",
		]);
		expect(cards[0]).toMatchObject({
			type: "incident",
			severity: "CRITICAL",
			sourceAddress: "spectralSet/witness",
		});
		expect(cards[2]).toMatchObject({
			type: "rejection",
			severity: "REJECT",
			rig: "spectralSet",
			polecat: "jasper",
		});
		expect(cards[3]).toMatchObject({
			type: "pinned-mail",
			severity: "PINNED",
			sender: "mayor/",
		});
	});

	test("ackCard removes the card from triage on next query", async () => {
		const store = memoryStore();
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [],
			listInboxFn: async () => [
				mail({
					id: "esc-1",
					subject: "polecat stalled",
					type: "escalation",
					priority: "high",
				}),
			],
			resolveTownPathFn: () => undefined,
			triageStateStore: store,
		});
		const caller = router.createCaller({});
		expect((await caller.triage()).cards).toHaveLength(1);
		await caller.ackCard({ cardId: "esc-1" });
		expect((await caller.triage()).cards).toEqual([]);
	});

	test("snoozeCard hides the card and reveals it after TTL", async () => {
		const store = memoryStore();
		let now = 1_000;
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [],
			listInboxFn: async () => [
				mail({
					id: "esc-2",
					subject: "stalled",
					type: "escalation",
					priority: "high",
				}),
			],
			resolveTownPathFn: () => undefined,
			triageStateStore: store,
			now: () => now,
		});
		const caller = router.createCaller({});
		await caller.snoozeCard({ cardId: "esc-2", ttlMs: 15 * 60_000 });
		expect((await caller.triage()).cards).toEqual([]);
		now += 15 * 60_000 + 1;
		const restored = await caller.triage();
		expect(restored.cards.map((c) => c.id)).toEqual(["esc-2"]);
	});

	test("openCard returns mail target for current card types", async () => {
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [],
			listInboxFn: async () => [],
			resolveTownPathFn: () => undefined,
		});
		const result = await router.createCaller({}).openCard({ cardId: "esc-1" });
		expect(result).toEqual({ type: "mail", target: "esc-1" });
	});

	test("skips non-urgent non-escalation messages entirely", async () => {
		const router = createGastownTodayRouter({
			listAgentsFn: async () => [],
			listInboxFn: async () => [
				mail({ id: "a", priority: "low" }),
				mail({ id: "b", priority: "normal" }),
				mail({ id: "c", priority: "backlog" }),
			],
			resolveTownPathFn: () => undefined,
		});
		const result = await router.createCaller({}).triage();
		expect(result.cards).toEqual([]);
	});
});
