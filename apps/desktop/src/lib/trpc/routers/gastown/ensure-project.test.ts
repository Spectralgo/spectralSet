import { describe, expect, test } from "bun:test";
import type { TerminalPreset } from "@spectralset/local-db";
import { MAYOR_PRESET_ID, upsertMayorPreset } from "./ensure-project-presets";
import { createGastownRouter } from "./index";

describe("upsertMayorPreset (pure logic)", () => {
	test("appends Mayor preset when list is empty", () => {
		const { presets, changed } = upsertMayorPreset({
			presets: [],
			projectId: "proj-1",
			townRoot: "/town",
			tmuxSocket: "sock-1",
		});
		expect(changed).toBe(true);
		expect(presets).toHaveLength(1);
		expect(presets[0]).toMatchObject({
			id: MAYOR_PRESET_ID,
			name: "Mayor terminal",
			cwd: "/town",
			commands: ["tmux -L sock-1 attach-session -t hq-mayor"],
			projectIds: ["proj-1"],
			pinnedToBar: true,
			applyOnWorkspaceCreated: true,
		});
	});

	test("falls back to socket-less tmux attach when tmuxSocket is null", () => {
		const { presets } = upsertMayorPreset({
			presets: [],
			projectId: "proj-1",
			townRoot: "/town",
			tmuxSocket: null,
		});
		expect(presets[0].commands).toEqual(["tmux attach-session -t hq-mayor"]);
	});

	test("is idempotent — does not append when preset id already present", () => {
		const existing: TerminalPreset = {
			id: MAYOR_PRESET_ID,
			name: "Mayor terminal",
			cwd: "/town",
			commands: ["tmux attach-session -t hq-mayor"],
		};
		const { presets, changed } = upsertMayorPreset({
			presets: [existing],
			projectId: "proj-1",
			townRoot: "/town",
			tmuxSocket: null,
		});
		expect(changed).toBe(false);
		expect(presets).toHaveLength(1);
		expect(presets[0]).toBe(existing);
	});

	test("preserves other presets when inserting Mayor preset", () => {
		const other: TerminalPreset = {
			id: "user-preset-1",
			name: "My shell",
			cwd: "/somewhere",
			commands: ["zsh"],
		};
		const { presets, changed } = upsertMayorPreset({
			presets: [other],
			projectId: "proj-1",
			townRoot: "/town",
			tmuxSocket: null,
		});
		expect(changed).toBe(true);
		expect(presets).toHaveLength(2);
		expect(presets[0]).toBe(other);
		expect(presets[1].id).toBe(MAYOR_PRESET_ID);
	});
});

describe("createGastownRouter ensureProject wiring", () => {
	test("forwards townRoot, townName, tmuxSocket to ensureProject impl", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			ensureProjectFn: async (input) => {
				calls.push(input);
				return { projectId: "proj-created" };
			},
		});
		const caller = router.createCaller({});
		const result = await caller.ensureProject({
			townRoot: "/Users/demo/town",
			townName: "demo",
			tmuxSocket: "spectralgastown-abc",
		});
		expect(result).toEqual({ projectId: "proj-created" });
		expect(calls[0]).toEqual({
			townRoot: "/Users/demo/town",
			townName: "demo",
			tmuxSocket: "spectralgastown-abc",
		});
	});

	test("passes null townName through so the impl can fall back to 'Gas Town'", async () => {
		const calls: unknown[] = [];
		const router = createGastownRouter({
			readTmuxTownRootFn: async () => ({
				townRoot: undefined,
				socket: undefined,
			}),
			ensureProjectFn: async (input) => {
				calls.push(input);
				return { projectId: "proj-created" };
			},
		});
		const caller = router.createCaller({});
		await caller.ensureProject({
			townRoot: "/Users/demo/town",
			townName: null,
			tmuxSocket: null,
		});
		expect(calls[0]).toMatchObject({ townName: null });
	});
});
