import {
	type AgentSummary,
	listAgents,
	listInbox,
	type MailMessage,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { resolveTownPath } from "./resolve-town-path";

const townPathSchema = z.string().min(1).optional();

const digestInputSchema = z
	.object({
		sinceTime: z.string().min(1).optional(),
		townPath: townPathSchema,
	})
	.optional();

const triageInputSchema = z
	.object({
		userAddress: z.string().min(1).optional(),
		townPath: townPathSchema,
	})
	.optional();

export const digestResultSchema = z.union([
	z.object({ firstLaunch: z.literal(true) }),
	z.object({
		sinceTime: z.string(),
		mergedCount: z.number().int().nonnegative(),
		awaitingReviewCount: z.number().int().nonnegative(),
		escalationsAckedCount: z.number().int().nonnegative(),
		polecatsAliveCount: z.number().int().nonnegative(),
	}),
]);
export type TodayDigest = z.infer<typeof digestResultSchema>;

export const triageCardSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("incident"),
		id: z.string(),
		severity: z.enum(["HIGH", "CRITICAL"]),
		title: z.string(),
		sourceAddress: z.string(),
		ageMs: z.number().int().nonnegative(),
	}),
	z.object({
		type: z.literal("rejection"),
		id: z.string(),
		severity: z.literal("REJECT"),
		title: z.string(),
		rig: z.string().nullable(),
		polecat: z.string().nullable(),
		ageMs: z.number().int().nonnegative(),
	}),
	z.object({
		type: z.literal("pinned-mail"),
		id: z.string(),
		severity: z.literal("PINNED"),
		sender: z.string(),
		subject: z.string(),
		ageMs: z.number().int().nonnegative(),
	}),
]);
export type TriageCard = z.infer<typeof triageCardSchema>;

const REJECTION_PATTERN = /\b(reject|merge failed|rework)\b/i;

const SEVERITY_RANK: Record<TriageCard["severity"], number> = {
	CRITICAL: 0,
	HIGH: 1,
	REJECT: 2,
	PINNED: 3,
};

function ageMsFrom(timestamp: string, now: number): number {
	const t = Date.parse(timestamp);
	return Number.isNaN(t) ? 0 : Math.max(0, now - t);
}

function classifyMail(mail: MailMessage, now: number): TriageCard | null {
	const ageMs = ageMsFrom(mail.timestamp, now);
	const { id, subject, from, type, priority } = mail;
	if (REJECTION_PATTERN.test(subject)) {
		const parts = from.split("/").filter(Boolean);
		const rig = parts[0] ?? null;
		const tail = parts.at(-1);
		const polecat = tail && tail !== rig ? tail : null;
		return {
			type: "rejection",
			id,
			severity: "REJECT",
			title: subject,
			rig,
			polecat,
			ageMs,
		};
	}
	const escSev =
		type === "escalation" && priority === "urgent"
			? "CRITICAL"
			: type === "escalation" && priority === "high"
				? "HIGH"
				: null;
	if (escSev) {
		return {
			type: "incident",
			id,
			severity: escSev,
			title: subject,
			sourceAddress: from,
			ageMs,
		};
	}
	if (priority === "urgent" || priority === "high") {
		return {
			type: "pinned-mail",
			id,
			severity: "PINNED",
			sender: from,
			subject,
			ageMs,
		};
	}
	return null;
}

interface GastownTodayRouterDeps {
	listAgentsFn?: typeof listAgents;
	listInboxFn?: typeof listInbox;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
	now?: () => number;
}

async function shellOptions() {
	return { env: await getProcessEnvWithShellPath() };
}

export const createGastownTodayRouter = (deps: GastownTodayRouterDeps = {}) => {
	const listAgentsImpl = deps.listAgentsFn ?? listAgents;
	const listInboxImpl = deps.listInboxFn ?? listInbox;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;
	const nowFn = deps.now ?? (() => Date.now());

	return router({
		digest: publicProcedure
			.input(digestInputSchema)
			.query(async ({ input }): Promise<TodayDigest> => {
				if (!input?.sinceTime) return { firstLaunch: true };
				let agents: AgentSummary[] = [];
				try {
					agents = await listAgentsImpl(
						{ townRoot: resolveTownPathImpl(input.townPath) },
						await shellOptions(),
					);
				} catch {
					agents = [];
				}
				const polecatsAliveCount = agents.filter(
					(a) => a.kind === "polecat" && a.state === "working",
				).length;
				return {
					sinceTime: input.sinceTime,
					mergedCount: 0,
					awaitingReviewCount: 0,
					escalationsAckedCount: 0,
					polecatsAliveCount,
				};
			}),
		triage: publicProcedure
			.input(triageInputSchema)
			.query(async ({ input }): Promise<{ cards: TriageCard[] }> => {
				let inbox: MailMessage[] = [];
				try {
					inbox = await listInboxImpl(
						{
							address: input?.userAddress,
							townRoot: resolveTownPathImpl(input?.townPath),
						},
						await shellOptions(),
					);
				} catch {
					inbox = [];
				}
				const now = nowFn();
				const cards: TriageCard[] = [];
				for (const m of inbox) {
					const card = classifyMail(m, now);
					if (card) cards.push(card);
				}
				cards.sort((a, b) => {
					const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
					return sev !== 0 ? sev : a.ageMs - b.ageMs;
				});
				return { cards };
			}),
	});
};
