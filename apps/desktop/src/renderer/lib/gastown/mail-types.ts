import type { MailMessage } from "@spectralset/gastown-cli-client";

export type { MailMessage };

export type MailPriority = MailMessage["priority"];

const PRIORITY_COLOR: Record<MailPriority, string> = {
	urgent: "bg-red-500/15 text-red-600 dark:text-red-400",
	high: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	normal: "bg-muted text-muted-foreground",
	low: "bg-muted text-muted-foreground/70",
	backlog: "bg-muted text-muted-foreground/60",
};

export function priorityBadgeClass(priority: MailPriority): string {
	return PRIORITY_COLOR[priority];
}
