import { describe, expect, it, mock } from "bun:test";
import {
	attachToAgent,
	buildAttachTabTitle,
	buildTmuxAttachCommand,
	buildTmuxSessionName,
} from "./attach-to-agent";

function makeDeps(
	overrides: Partial<Parameters<typeof attachToAgent>[1]> = {},
) {
	return {
		findExistingAttachTab: mock(() => null),
		activateTab: mock(() => {}),
		addTab: mock(() => ({ tabId: "tab-new", paneId: "pane-new" })),
		setTabTitle: mock(() => {}),
		createOrAttach: mock(async () => ({})),
		writeToTerminal: mock(async () => ({})),
		...overrides,
	};
}

describe("buildTmuxSessionName", () => {
	it("joins prefix + polecat with a hyphen", () => {
		expect(buildTmuxSessionName("ss", "jasper")).toBe("ss-jasper");
	});
});

describe("buildTmuxAttachCommand", () => {
	it("emits the -L socket + attach-session form", () => {
		expect(buildTmuxAttachCommand("spectralgastown-a292c7", "ss-onyx")).toBe(
			"tmux -L spectralgastown-a292c7 attach-session -t ss-onyx",
		);
	});
});

describe("buildAttachTabTitle", () => {
	it("includes state when provided", () => {
		expect(buildAttachTabTitle("jasper", "working")).toBe("jasper • working");
	});
	it("falls back to polecat name when no state", () => {
		expect(buildAttachTabTitle("jasper")).toBe("jasper");
	});
});

describe("attachToAgent", () => {
	it("creates a new terminal tab and writes the tmux attach command", async () => {
		const deps = makeDeps();
		const result = await attachToAgent(
			{
				rig: "spectralSet",
				polecat: "onyx",
				rigPrefix: "ss",
				tmuxSocket: "spectralgastown-a292c7",
				workspaceId: "ws-1",
				state: "working",
				cwd: "/town/spectralSet/polecats/onyx/spectralSet",
			},
			deps,
		);

		expect(result).toEqual({
			outcome: "created-new",
			tabId: "tab-new",
			paneId: "pane-new",
		});
		expect(deps.findExistingAttachTab).toHaveBeenCalledWith({
			rig: "spectralSet",
			polecat: "onyx",
			rigPrefix: "ss",
		});
		expect(deps.addTab).toHaveBeenCalledWith("ws-1");
		expect(deps.setTabTitle).toHaveBeenCalledWith("tab-new", "onyx • working");
		expect(deps.createOrAttach).toHaveBeenCalledWith({
			paneId: "pane-new",
			tabId: "tab-new",
			workspaceId: "ws-1",
			cwd: "/town/spectralSet/polecats/onyx/spectralSet",
			joinPending: true,
		});
		expect(deps.writeToTerminal).toHaveBeenCalledWith({
			paneId: "pane-new",
			data: "tmux -L spectralgastown-a292c7 attach-session -t ss-onyx\n",
			throwOnError: true,
		});
		expect(deps.activateTab).not.toHaveBeenCalled();
	});

	it("focuses an existing attach tab instead of spawning a new one", async () => {
		const deps = makeDeps({
			findExistingAttachTab: mock(() => ({
				tabId: "tab-existing",
				paneId: "pane-existing",
			})),
		});

		const result = await attachToAgent(
			{
				rig: "spectralSet",
				polecat: "onyx",
				rigPrefix: "ss",
				tmuxSocket: "spectralgastown-a292c7",
				workspaceId: "ws-1",
			},
			deps,
		);

		expect(result).toEqual({
			outcome: "focused-existing",
			tabId: "tab-existing",
			paneId: "pane-existing",
		});
		expect(deps.activateTab).toHaveBeenCalledWith("tab-existing");
		expect(deps.addTab).not.toHaveBeenCalled();
		expect(deps.createOrAttach).not.toHaveBeenCalled();
		expect(deps.writeToTerminal).not.toHaveBeenCalled();
	});
});
