import { z } from "zod";

export const rigAgentSchema = z.object({
	rig: z.string(),
	name: z.string(),
	role: z.enum(["mayor", "polecat", "refinery", "witness", "crew"]),
	session: z.string().nullable(),
	state: z
		.enum(["working", "idle", "done", "stalled", "zombie", "nuked"])
		.nullable(),
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
