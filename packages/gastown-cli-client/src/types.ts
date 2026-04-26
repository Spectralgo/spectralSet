import { z } from "zod";

export const rigAgentSchema = z.object({
	rig: z.string(),
	name: z.string(),
	role: z.enum(["mayor", "polecat", "refinery", "witness", "crew"]),
	session: z.string().nullable(),
	state: z
		.enum(["working", "idle", "done", "stalled", "zombie", "nuked"])
		.nullable(),
	// running=true means gt found a live tmux session for this agent.
	// Distinguishes "idle but alive" from "stopped" — both can have state=idle
	// per gt's defaults, so the renderer needs `running` to color them
	// differently in the sidebar.
	running: z.boolean(),
});

export type RigAgent = z.infer<typeof rigAgentSchema>;

export const rigSchema = z.object({
	name: z.string(),
	witnessRunning: z.boolean(),
	refineryRunning: z.boolean(),
	polecatCount: z.number().int().nonnegative(),
	crewCount: z.number().int().nonnegative(),
	agents: z.array(rigAgentSchema),
});

export type Rig = z.infer<typeof rigSchema>;

export const probeResultSchema = z.object({
	installed: z.boolean(),
	version: z.string().nullable(),
	townRoot: z.string().nullable(),
	townName: z.string().nullable(),
	rigs: z.array(rigSchema),
	daemonRunning: z.boolean(),
	doltRunning: z.boolean(),
	// Socket name of the running Gas Town tmux server (e.g.
	// "spectralgastown-a292c7"). Discovered from tmux by the desktop host;
	// the cli-client itself always returns null. Used to build
	// `tmux -L <socket> attach-session -t <prefix>-<polecat>` commands
	// when the renderer attaches to a live polecat session.
	tmuxSocket: z.string().nullable(),
});

export type ProbeResult = z.infer<typeof probeResultSchema>;

export const polecatStateSchema = z.enum([
	"working",
	"stalled",
	"zombie",
	"idle",
	"done",
	"nuked",
]);

export type PolecatState = z.infer<typeof polecatStateSchema>;

export const polecatSchema = z.object({
	rig: z.string(),
	name: z.string(),
	state: polecatStateSchema,
	currentBead: z.string().optional(),
	currentBeadTitle: z.string().optional(),
});

export type Polecat = z.infer<typeof polecatSchema>;

export const peekResultSchema = z.object({
	output: z.string(),
});

export type PeekResult = z.infer<typeof peekResultSchema>;

export const beadStatusSchema = z.enum([
	"open",
	"in_progress",
	"blocked",
	"deferred",
	"closed",
	"pinned",
	"hooked",
]);

export type BeadStatus = z.infer<typeof beadStatusSchema>;

export const beadSchema = z.object({
	id: z.string(),
	title: z.string(),
	type: z.string(),
	priority: z.number().int(),
	status: z.string(),
	labels: z.array(z.string()).optional(),
	assignee: z.string().optional(),
});

export type Bead = z.infer<typeof beadSchema>;

export const beadListSchema = z.array(beadSchema);

export const mergeStrategySchema = z.enum(["direct", "mr", "local"]);

export type MergeStrategy = z.infer<typeof mergeStrategySchema>;

export const slingResultSchema = z.object({
	wispId: z.string(),
	polecat: z.string(),
});

export type SlingResult = z.infer<typeof slingResultSchema>;

export const recoveryStatusSchema = z.object({
	rig: z.string(),
	polecat: z.string(),
	cleanupStatus: z.string(),
	needsRecovery: z.boolean(),
	verdict: z.string(),
	branch: z.string().optional(),
	issue: z.string().optional(),
});

export type RecoveryStatus = z.infer<typeof recoveryStatusSchema>;

export const recoveryCheckSchema = z.object({
	status: recoveryStatusSchema,
	canNuke: z.boolean(),
	reason: z.string().optional(),
	suggestions: z.array(z.string()).optional(),
});

export type RecoveryCheck = z.infer<typeof recoveryCheckSchema>;

export const nukeResultSchema = z.object({
	ok: z.literal(true),
	closedBead: z.string().optional(),
});

export type NukeResult = z.infer<typeof nukeResultSchema>;

export const mailPrioritySchema = z.enum([
	"urgent",
	"high",
	"normal",
	"low",
	"backlog",
]);

export type MailPriority = z.infer<typeof mailPrioritySchema>;

// `gt mail inbox --json` emits `escalation` alongside the four send-side
// types documented in `gt mail send --help`. Accept both so parsing
// real inbox payloads doesn't fail; the tRPC send input still restricts
// callers to the four valid send types.
export const mailTypeSchema = z.enum([
	"task",
	"scavenge",
	"notification",
	"reply",
	"escalation",
]);

export type MailType = z.infer<typeof mailTypeSchema>;

export const mailSendTypeSchema = z.enum([
	"task",
	"scavenge",
	"notification",
	"reply",
]);

export type MailSendType = z.infer<typeof mailSendTypeSchema>;

export const mailMessageSchema = z.object({
	id: z.string(),
	from: z.string(),
	to: z.string(),
	subject: z.string(),
	body: z.string(),
	timestamp: z.string(),
	read: z.boolean(),
	priority: mailPrioritySchema,
	type: mailTypeSchema,
});

export type MailMessage = z.infer<typeof mailMessageSchema>;

export const mailMessageArraySchema = z.array(mailMessageSchema);

// `gt convoy list --json` / `gt convoy status <id> --json`.
// `status` on the convoy and tracked entries is passed through as a string —
// the gt enum may drift (open/closed/in_progress/blocked/...) and we do not
// want the renderer to fail parsing when a new variant appears.
export const convoyTrackedSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.string(),
	dependency_type: z.string(),
	issue_type: z.string(),
});

export type ConvoyTracked = z.infer<typeof convoyTrackedSchema>;

export const convoySchema = z
	.object({
		id: z.string(),
		title: z.string(),
		status: z.string(),
		created_at: z.string(),
		tracked: z.array(convoyTrackedSchema),
		completed: z.number().nullable().optional(),
		total: z.number().nullable().optional(),
	})
	.passthrough();

export type Convoy = z.infer<typeof convoySchema>;

export const convoyArraySchema = z.array(convoySchema);

// `gt convoy status <id> --json` returns a richer shape than `list` and
// currently omits `created_at` (upstream gt CLI inconsistency, tracked as
// gt-convoy-status-missing-created-at). Keep list-side strict; relax only
// the status schema so the renderer parses it cleanly.
export const convoyStatusSchema = convoySchema
	.omit({ created_at: true })
	.extend({ created_at: z.string().optional() });

export type ConvoyStatus = z.infer<typeof convoyStatusSchema>;

// `gt status --json` surfaces top-level agents (mayor/deacon/boot) and
// rig-scoped agents (polecat/crew/witness/refinery). The CV data layer
// flattens both shapes into a single AgentSummary stream so the renderer
// can render every agent uniformly as a card.
export const agentKindSchema = z.enum([
	"mayor",
	"deacon",
	"boot",
	"polecat",
	"crew",
	"witness",
	"refinery",
]);

export type AgentKind = z.infer<typeof agentKindSchema>;

export const agentStateSchema = z.enum([
	"idle",
	"working",
	"stalled",
	"zombie",
	"done",
	"nuked",
]);

export type AgentState = z.infer<typeof agentStateSchema>;

export const agentSummarySchema = z.object({
	kind: agentKindSchema,
	name: z.string(),
	address: z.string(),
	session: z.string(),
	role: z.string(),
	rig: z.string().nullable(),
	running: z.boolean(),
	state: agentStateSchema,
	unreadMail: z.number().int().nonnegative(),
	firstSubject: z.string().nullable(),
});

export type AgentSummary = z.infer<typeof agentSummarySchema>;

export const agentDetailSchema = agentSummarySchema.extend({
	agentBeadId: z.string().nullable(),
	hookBead: z.string().nullable(),
	activeMr: z.string().nullable(),
	branch: z.string().nullable(),
	cleanupStatus: z.string().nullable(),
	exitType: z.string().nullable(),
	completionTime: z.string().nullable(),
	// Best-effort list of recent closed beads authored by this agent. If the
	// derivation path is unclear or too expensive, ship as an empty array.
	recentCompletions: z
		.array(
			z.object({
				beadId: z.string(),
				title: z.string(),
				closedAt: z.string().nullable(),
			}),
		)
		.default([]),
});

export type AgentDetail = z.infer<typeof agentDetailSchema>;

/**
 * A single entry from `git worktree list --porcelain`. Used by the
 * SpectralSet × Gas Town worktree bridge to discover polecat sandboxes.
 */
export const worktreeSchema = z.object({
	path: z.string(),
	branch: z.string().nullable(),
	head: z.string(),
	isDetached: z.boolean(),
	isBare: z.boolean(),
});

export type Worktree = z.infer<typeof worktreeSchema>;

// Convoy-board narrowed bead status. Raw bd statuses (in_progress/deferred/
// pinned) collapse to "open"; "stranded" is derived in the UI when an open
// bead has no available polecat.
export type ConvoyBeadStatus =
	| "open"
	| "hooked"
	| "closed"
	| "blocked"
	| "stranded";

export interface ConvoyBead {
	id: string;
	title: string;
	status: ConvoyBeadStatus;
	assignee: string | null;
	priority: number;
}
