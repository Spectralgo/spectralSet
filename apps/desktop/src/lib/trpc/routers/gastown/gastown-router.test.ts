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
			probeFn: async () =>
				makeProbeResult({ townRoot: "/Users/demo/town" }),
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
			probeFn: async () =>
				makeProbeResult({ townRoot: "/Users/demo/cached" }),
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
});
