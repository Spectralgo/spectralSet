import { describe, expect, test } from "bun:test";
import type {
	AgentSummary,
	ProbeResult,
} from "@spectralset/gastown-cli-client";
import { createGastownStatusCache } from "./status-cache";

function agent(id: string): AgentSummary {
	return {
		kind: "polecat",
		name: id,
		address: `alpha/${id}`,
		session: `alpha-${id}`,
		role: "polecat",
		rig: "alpha",
		running: true,
		state: "working",
		unreadMail: 0,
		firstSubject: null,
	};
}

function probe(townRoot: string | null): ProbeResult {
	return {
		installed: townRoot !== null,
		version: null,
		townRoot,
		townName: townRoot ? "town" : null,
		rigs: [],
		daemonRunning: townRoot !== null,
		doltRunning: townRoot !== null,
		tmuxSocket: null,
	};
}

describe("createGastownStatusCache", () => {
	test("shares one status snapshot across probe and agent list reads", async () => {
		const calls: Array<{ townRoot?: string }> = [];
		const cache = createGastownStatusCache({
			readStatusSnapshotFn: async (args) => {
				calls.push({ townRoot: args?.townRoot });
				return {
					probe: probe("/town"),
					agents: [agent("jasper")],
				};
			},
			staleMs: 10_000,
			now: () => 1_000,
		});

		const env = { GT_TOWN_ROOT: "/town", HOME: "/Users/demo", PATH: "/bin" };
		await expect(cache.probe({ cwd: "/town", env })).resolves.toMatchObject({
			townRoot: "/town",
		});
		await expect(
			cache.listAgents(
				{ townRoot: "/town" },
				{ cwd: "/Users/demo", env: { HOME: env.HOME, PATH: env.PATH } },
			),
		).resolves.toEqual([agent("jasper")]);
		expect(calls).toEqual([{ townRoot: "/town" }]);
	});

	test("serves fresh cached agent lists without re-running listAgents", async () => {
		let calls = 0;
		const cache = createGastownStatusCache({
			listAgentsFn: async () => {
				calls += 1;
				return [agent(`p${calls}`)];
			},
			probeFn: async () => probe("/town"),
			staleMs: 10_000,
			now: () => 1_000,
		});

		await expect(cache.listAgents({ townRoot: "/town" })).resolves.toEqual([
			agent("p1"),
		]);
		await expect(cache.listAgents({ townRoot: "/town" })).resolves.toEqual([
			agent("p1"),
		]);
		expect(calls).toBe(1);
	});

	test("returns stale agent data immediately while refreshing in the background", async () => {
		let calls = 0;
		let now = 1_000;
		let resolveRefresh: (agents: AgentSummary[]) => void = () => {};
		let refreshDone: Promise<void> = Promise.resolve();
		const cache = createGastownStatusCache({
			listAgentsFn: async () => {
				calls += 1;
				if (calls === 1) return [agent("old")];
				let done: () => void = () => {};
				refreshDone = new Promise<void>((resolve) => {
					done = resolve;
				});
				return new Promise<AgentSummary[]>((resolve) => {
					resolveRefresh = (agents) => {
						resolve(agents);
						setTimeout(done, 0);
					};
				});
			},
			probeFn: async () => probe("/town"),
			staleMs: 10,
			now: () => now,
		});

		expect(await cache.listAgents({ townRoot: "/town" })).toEqual([
			agent("old"),
		]);
		now = 2_000;
		expect(await cache.listAgents({ townRoot: "/town" })).toEqual([
			agent("old"),
		]);
		expect(calls).toBe(2);

		resolveRefresh([agent("new")]);
		await refreshDone;
		now = 2_001;
		expect(await cache.listAgents({ townRoot: "/town" })).toEqual([
			agent("new"),
		]);
	});

	test("caches probe results separately by cwd", async () => {
		let calls = 0;
		const cache = createGastownStatusCache({
			listAgentsFn: async () => [],
			probeFn: async (options) => {
				calls += 1;
				return probe(options?.cwd ?? null);
			},
			staleMs: 10_000,
			now: () => 1_000,
		});

		expect(await cache.probe({ cwd: "/town-a" })).toMatchObject({
			townRoot: "/town-a",
		});
		expect(await cache.probe({ cwd: "/town-a" })).toMatchObject({
			townRoot: "/town-a",
		});
		expect(await cache.probe({ cwd: "/town-b" })).toMatchObject({
			townRoot: "/town-b",
		});
		expect(calls).toBe(2);
	});

	test("clear forces probe and agent list refills", async () => {
		let agentCalls = 0;
		let probeCalls = 0;
		const cache = createGastownStatusCache({
			listAgentsFn: async () => {
				agentCalls += 1;
				return [agent(`p${agentCalls}`)];
			},
			probeFn: async () => {
				probeCalls += 1;
				return probe(`/town-${probeCalls}`);
			},
			staleMs: 10_000,
			now: () => 1_000,
		});

		expect(await cache.listAgents({ townRoot: "/town" })).toEqual([
			agent("p1"),
		]);
		expect(await cache.probe({ cwd: "/town" })).toMatchObject({
			townRoot: "/town-1",
		});
		cache.clear();
		expect(await cache.listAgents({ townRoot: "/town" })).toEqual([
			agent("p2"),
		]);
		expect(await cache.probe({ cwd: "/town" })).toMatchObject({
			townRoot: "/town-2",
		});
	});
});
