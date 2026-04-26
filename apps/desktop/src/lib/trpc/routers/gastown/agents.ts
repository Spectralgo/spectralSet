import {
	agentKindSchema,
	getAgent,
	listAgents,
} from "@spectralset/gastown-cli-client";
import { observable } from "@trpc/server/observable";
import {
	type ClaudePolecatLiveness,
	ClaudeSessionWatcher,
	type ClaudeStateChange,
} from "main/gastown/claude-session-watcher";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { resolveTownPath } from "./resolve-town-path";

// Singleton + ref-count: sidebar AgentRow and Agents-pane AgentCard often
// both subscribe to the same (rig,name). Ref-count so the underlying
// fs.watch only opens once and only closes when the last subscriber
// unsubscribes; cache latest state so a second subscriber sees current
// state immediately instead of waiting for the next file change.
const claudeSessionWatcher = new ClaudeSessionWatcher();
const watchRefs = new Map<string, number>();
const latestState = new Map<string, SessionStateEvent>();

claudeSessionWatcher.on("change", (e: ClaudeStateChange) => {
	latestState.set(`${e.agent.rig}/${e.agent.name}`, {
		state: e.state,
		lastEventAt: e.lastEventAt ?? null,
	});
});

export interface SessionStateEvent {
	state: ClaudePolecatLiveness;
	lastEventAt: number | null;
}

const townPathSchema = z.string().min(1).optional();

const listAgentsInputSchema = z
	.object({
		townPath: townPathSchema,
	})
	.optional();

const getAgentInputSchema = z.object({
	kind: agentKindSchema,
	rig: z.string().min(1).optional(),
	name: z.string().min(1),
	townPath: townPathSchema,
});

interface GastownAgentsRouterDeps {
	listAgentsFn?: typeof listAgents;
	getAgentFn?: typeof getAgent;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
}

async function shellOptions() {
	return { env: await getProcessEnvWithShellPath() };
}

export const createGastownAgentsRouter = (
	deps: GastownAgentsRouterDeps = {},
) => {
	const listAgentsImpl = deps.listAgentsFn ?? listAgents;
	const getAgentImpl = deps.getAgentFn ?? getAgent;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;

	return router({
		list: publicProcedure
			.input(listAgentsInputSchema)
			.query(async ({ input }) => {
				const resolved = resolveTownPathImpl(input?.townPath);
				const opts = await shellOptions();
				try {
					return await listAgentsImpl({ townRoot: resolved }, opts);
				} catch (e) {
					const err = e as Error;
					console.error("[gastown-agents.list] FAIL", {
						message: err.message,
						name: err.name,
						stack: err.stack?.split("\n").slice(0, 6).join(" | "),
						cause: (err as unknown as { cause?: unknown }).cause,
					});
					throw e;
				}
			}),
		get: publicProcedure.input(getAgentInputSchema).query(async ({ input }) =>
			getAgentImpl(
				{
					kind: input.kind,
					rig: input.rig,
					name: input.name,
					townRoot: resolveTownPathImpl(input.townPath),
				},
				await shellOptions(),
			),
		),
		sessionState: publicProcedure
			.input(
				z.object({
					// Empty rig is allowed for town-level agents (mayor) which
					// are not scoped to a rig. Watcher events are matched by
					// (rig, name) so the empty rig still partitions correctly.
					rig: z.string(),
					name: z.string().min(1),
					cloneDir: z.string().min(1),
				}),
			)
			.subscription(({ input }) =>
				observable<SessionStateEvent>((emit) => {
					const key = `${input.rig}/${input.name}`;
					const handler = (e: ClaudeStateChange) => {
						if (e.agent.rig !== input.rig || e.agent.name !== input.name)
							return;
						emit.next({ state: e.state, lastEventAt: e.lastEventAt ?? null });
					};
					claudeSessionWatcher.on("change", handler);
					const refs = watchRefs.get(key) ?? 0;
					watchRefs.set(key, refs + 1);
					if (refs === 0) {
						void claudeSessionWatcher.watch(input);
					} else {
						const cached = latestState.get(key);
						if (cached) emit.next(cached);
					}
					return () => {
						claudeSessionWatcher.off("change", handler);
						const remaining = (watchRefs.get(key) ?? 1) - 1;
						if (remaining <= 0) {
							watchRefs.delete(key);
							latestState.delete(key);
							claudeSessionWatcher.unwatch(input);
						} else {
							watchRefs.set(key, remaining);
						}
					};
				}),
			),
	});
};
