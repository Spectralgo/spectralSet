import { describe, expect, test } from "bun:test";
import type {
	AgentDetail,
	AgentSummary,
	ProbeResult,
} from "@spectralset/gastown-cli-client";
import { createGastownRouter } from "./index";

function makeProbeResult(overrides: Partial<ProbeResult> = {}): ProbeResult {
	return {
		installed: true,
		version: null,
		townRoot: "/Users/demo/town",
		townName: "demo",
		rigs: [],
		daemonRunning: true,
		doltRunning: true,
		tmuxSocket: null,
		...overrides,
	};
}

function makeAgent(name: string): AgentSummary {
	return {
		kind: "polecat",
		name,
		address: `alpha/${name}`,
		session: `alpha-${name}`,
		role: "polecat",
		rig: "alpha",
		running: true,
		state: "working",
		unreadMail: 0,
		firstSubject: null,
	};
}

describe("createGastownRouter townPath threading", () => {
	test("listRigs forwards trimmed townPath as townRoot to cli-client", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			listRigsFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.listRigs({ townPath: "/Users/demo/town/" });
		expect(calls[0]).toMatchObject({ townRoot: "/Users/demo/town" });
	});

	test("listRigs passes townRoot=undefined when townPath omitted", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			listRigsFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.listRigs();
		expect(calls[0]).toEqual({ townRoot: undefined });
	});

	test("peek forwards townPath as townRoot for rig-scoped composition", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			peekFn: async (args) => {
				calls.push(args);
				return { output: "ok" };
			},
		});
		const caller = router.createCaller({});
		await caller.peek({
			rig: "alpha",
			polecat: "quartz",
			townPath: "/Users/demo/town",
		});
		expect(calls[0]).toMatchObject({
			rig: "alpha",
			polecat: "quartz",
			townRoot: "/Users/demo/town",
		});
	});

	test("listBeads forwards townPath as gastownRoot", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			listBeadsFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.listBeads({
			rig: "alpha",
			townPath: "/Users/demo/town",
		});
		expect(calls[0]).toMatchObject({
			rig: "alpha",
			gastownRoot: "/Users/demo/town",
		});
	});

	test("probe sets cwd from townPath via shellOptions", async () => {
		const optsCapture: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			probeFn: async (opts) => {
				optsCapture.push(opts);
				return makeProbeResult();
			},
		});
		const caller = router.createCaller({});
		await caller.probe({ townPath: "/Users/demo/town" });
		expect((optsCapture[0] as { cwd?: string }).cwd).toBe("/Users/demo/town");
	});

	test("cached probe.townRoot is used as fallback when townPath is blank", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			probeFn: async () => makeProbeResult({ townRoot: "/Users/demo/town" }),
			listRigsFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.probe();
		await caller.listRigs();
		expect(calls[0]).toMatchObject({ townRoot: "/Users/demo/town" });
	});

	test("user-supplied townPath wins over cached probe townRoot", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			probeFn: async () => makeProbeResult({ townRoot: "/Users/demo/cached" }),
			listRigsFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.probe();
		await caller.listRigs({ townPath: "/Users/demo/override" });
		expect(calls[0]).toMatchObject({ townRoot: "/Users/demo/override" });
	});

	test("re-probing with a different townRoot overwrites the cache", async () => {
		const calls: unknown[] = [];
		let nextRoot = "/Users/demo/first";
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			probeFn: async () => makeProbeResult({ townRoot: nextRoot }),
			listRigsFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.probe();
		await caller.listRigs();
		nextRoot = "/Users/demo/second";
		await caller.probe();
		await caller.listRigs();
		expect(calls[0]).toMatchObject({ townRoot: "/Users/demo/first" });
		expect(calls[1]).toMatchObject({ townRoot: "/Users/demo/second" });
	});

	test("probe with townRoot=null clears the cache", async () => {
		const calls: unknown[] = [];
		let nextRoot: string | null = "/Users/demo/town";
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			probeFn: async () => makeProbeResult({ townRoot: nextRoot }),
			listRigsFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.probe();
		await caller.listRigs();
		nextRoot = null;
		await caller.probe();
		await caller.listRigs();
		expect(calls[0]).toMatchObject({ townRoot: "/Users/demo/town" });
		expect(calls[1]).toEqual({ townRoot: undefined });
	});

	test("listWorktrees forwards rig + resolved townRoot", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			listWorktreesFn: async (args) => {
				calls.push(args);
				return [];
			},
		});
		const caller = router.createCaller({});
		await caller.listWorktrees({ rig: "alpha", townPath: "/Users/demo/town" });
		expect(calls[0]).toMatchObject({
			rig: "alpha",
			townRoot: "/Users/demo/town",
		});
	});

	test("reconcile collates worktrees + polecats and hands specs to applyReconciliation", async () => {
		const specsCapture: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			listWorktreesFn: async () => [
				{
					path: "/t/alpha/polecats/jasper/alpha",
					branch: "polecat/jasper-mo5xo851",
					head: "abc",
					isBare: false,
					isDetached: false,
				},
				{
					path: "/t/alpha/.repo.git",
					branch: null,
					head: "",
					isBare: true,
					isDetached: false,
				},
			],
			listPolecatsFn: async () => [
				{
					rig: "alpha",
					name: "jasper",
					state: "working",
					currentBead: "a-42",
				},
			],
			applyReconciliationFn: async (opts) => {
				specsCapture.push(opts);
				return { registered: ["jasper"], updated: [], archived: [] };
			},
		});
		const caller = router.createCaller({});
		const result = await caller.reconcile({
			rig: "alpha",
			projectId: "proj-1",
			townPath: "/t",
		});
		expect(result.registered).toEqual(["jasper"]);
		expect(specsCapture).toHaveLength(1);
		const captured = specsCapture[0] as {
			projectId: string;
			specs: Array<{ polecatName: string; beadId: string | null }>;
		};
		expect(captured.projectId).toBe("proj-1");
		expect(captured.specs).toHaveLength(1);
		expect(captured.specs[0].polecatName).toBe("jasper");
		expect(captured.specs[0].beadId).toBe("a-42");
	});

	test("probe returns tmuxSocket discovered from the tmux env", async () => {
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: "/Users/demo/town",
				socket: "spectralgastown-a292c7",
			}),
			probeFn: async () => makeProbeResult(),
		});
		const caller = router.createCaller({});
		const result = await caller.probe();
		expect(result.tmuxSocket).toBe("spectralgastown-a292c7");
	});

	test("probe returns tmuxSocket=null when no Gas Town tmux is running", async () => {
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			probeFn: async () => makeProbeResult(),
		});
		const caller = router.createCaller({});
		const result = await caller.probe();
		expect(result.tmuxSocket).toBeNull();
	});

	test("nudge forwards rig + polecat + message + resolved townRoot", async () => {
		const calls: Array<{
			rig: string;
			polecat: string;
			message: string;
			townRoot?: string;
		}> = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			nudgeFn: async (args) => {
				calls.push(args);
			},
		});
		const caller = router.createCaller({});
		const result = await caller.nudge({
			rig: "alpha",
			polecat: "jasper",
			message: "status please",
			townPath: "/Users/demo/town",
		});
		expect(result).toEqual({ ok: true });
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			rig: "alpha",
			polecat: "jasper",
			message: "status please",
			townRoot: "/Users/demo/town",
		});
	});

	test("agents.list and today.digest share cached agent status", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			listAgentsFn: async (args) => {
				calls.push(args);
				return [makeAgent("jasper")];
			},
		});
		const caller = router.createCaller({});

		await caller.agents.list({ townPath: "/Users/demo/town" });
		const digest = await caller.today.digest({
			sinceTime: "2026-04-26T00:00:00Z",
			townPath: "/Users/demo/town",
		});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ townRoot: "/Users/demo/town" });
		expect(digest).toMatchObject({ polecatsAliveCount: 1 });
	});

	test("agents.get reuses cached agent status after agents.list", async () => {
		const calls: unknown[] = [];
		const detailCalls: unknown[] = [];
		const summary = makeAgent("jasper");
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			listAgentsFn: async (args) => {
				calls.push(args);
				return [summary];
			},
			getAgentFromSummariesFn: async (args, summaries) => {
				detailCalls.push({ args, summaries });
				return {
					...summary,
					agentBeadId: "ss-alpha-polecat-jasper",
					hookBead: null,
					activeMr: null,
					branch: null,
					cleanupStatus: null,
					exitType: null,
					completionTime: null,
					recentCompletions: [],
				} satisfies AgentDetail;
			},
		});
		const caller = router.createCaller({});

		await caller.agents.list({ townPath: "/Users/demo/town" });
		const detail = await caller.agents.get({
			kind: "polecat",
			rig: "alpha",
			name: "jasper",
			townPath: "/Users/demo/town",
		});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ townRoot: "/Users/demo/town" });
		expect(detailCalls).toEqual([
			{
				args: {
					kind: "polecat",
					rig: "alpha",
					name: "jasper",
					townRoot: "/Users/demo/town",
				},
				summaries: [summary],
			},
		]);
		expect(detail.agentBeadId).toBe("ss-alpha-polecat-jasper");
	});
});
