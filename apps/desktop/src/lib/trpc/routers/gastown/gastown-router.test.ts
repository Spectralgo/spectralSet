import { describe, expect, test } from "bun:test";
import type { ProbeResult } from "@spectralset/gastown-cli-client";
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
		...overrides,
	};
}

describe("createGastownRouter townPath threading", () => {
	test("listRigs forwards trimmed townPath as townRoot to cli-client", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
			readTmuxTownRootFn: async () => undefined,
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
});
