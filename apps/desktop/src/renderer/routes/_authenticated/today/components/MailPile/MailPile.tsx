import { Button } from "@spectralset/ui/button";
import { toast } from "@spectralset/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { InboxIcon } from "lucide-react";
import { useState } from "react";
import { MAIL_INBOX_QUERY_KEY } from "renderer/components/Gastown/MailPanel/ComposeMailDialog";
import { useOptimisticMutation } from "renderer/hooks/useOptimisticMutation";
import type { MailMessage } from "renderer/lib/gastown/mail-types";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useMailPileKeybindings } from "./useMailPileKeybindings";

export interface MailPileProps {
	messages: readonly MailMessage[];
	townPath?: string;
	now?: Date;
}

export function formatPileRelative(from: Date, now: Date): string {
	const d = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
	if (d <= 5) return "just now";
	if (d <= 59) return `${d}s ago`;
	if (d <= 3599) return `${Math.floor(d / 60)}m ago`;
	if (d <= 86399) return `${Math.floor(d / 3600)}h ago`;
	return `${Math.floor(d / 86400)}d ago`;
}

export function pileRowCopy(m: MailMessage, now: Date): string {
	const t = new Date(m.timestamp);
	const rel = Number.isNaN(t.getTime())
		? m.timestamp
		: formatPileRelative(t, now);
	return `${m.from} · ${m.subject || "(no subject)"} · ${rel}`;
}

export function MailPile({ messages, townPath, now }: MailPileProps) {
	const [expanded, setExpanded] = useState(false);
	const qc = useQueryClient();
	const clockNow = now ?? new Date();
	const count = messages.length;
	const tp = townPath || undefined;
	const done = (verb: string) => (_r: unknown, v: { ids: string[] }) => {
		toast.success(
			`${verb} ${v.ids.length}${verb === "Archived" ? "." : " read."}`,
		);
		qc.invalidateQueries({ queryKey: MAIL_INBOX_QUERY_KEY });
	};
	const failToast = (verb: string) => (_e: Error, v: { ids: string[] }) => {
		const n = v.ids.length;
		toast.error(`${verb} failed for ${n} item${n === 1 ? "" : "s"} · retry`);
	};
	const archive = useOptimisticMutation<
		{ ok: true },
		Error,
		{ ids: string[]; townPath?: string },
		MailMessage[]
	>({
		mutationFn: (input) =>
			electronTrpcClient.gastown.mail.archive.mutate(input),
		queryKey: MAIL_INBOX_QUERY_KEY,
		applyOptimistic: (prev, vars) =>
			prev?.filter((m) => !vars.ids.includes(m.id)),
		onSuccess: (r, v) => done("Archived")(r, v),
		onError: failToast("Archive"),
	});
	const markRead = useOptimisticMutation<
		{ ok: true },
		Error,
		{ ids: string[]; townPath?: string },
		MailMessage[]
	>({
		mutationFn: (input) =>
			electronTrpcClient.gastown.mail.markRead.mutate(input),
		queryKey: MAIL_INBOX_QUERY_KEY,
		applyOptimistic: (prev, vars) =>
			prev?.map((m) => (vars.ids.includes(m.id) ? { ...m, read: true } : m)),
		onSuccess: (r, v) => done("Marked")(r, v),
		onError: failToast("Mark-read"),
	});
	const busy = archive.isPending || markRead.isPending;
	const onBulkArchive = () => {
		const ids = messages.map((m) => m.id);
		if (ids.length) archive.mutate({ ids, townPath: tp });
	};
	const onMarkAllRead = () => {
		const ids = messages.filter((m) => !m.read).map((m) => m.id);
		if (ids.length) markRead.mutate({ ids, townPath: tp });
	};
	const onToggle = () => setExpanded((e) => !e);

	useMailPileKeybindings({
		enabled: count > 0,
		expanded,
		onToggle,
		onBulkArchive,
		onMarkAllRead,
	});

	if (count === 0) {
		return (
			<section aria-label="Mail pile" data-testid="mail-pile">
				<p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
					<InboxIcon aria-hidden="true" className="h-3.5 w-3.5" />
					Inbox clear · all caught up
				</p>
			</section>
		);
	}
	return (
		<section aria-label="Mail pile" data-testid="mail-pile">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={expanded}
				className="flex w-full items-center justify-between py-2 text-sm text-foreground"
			>
				<span>{`Mail — ${count} unprocessed`}</span>
				<span className="text-xs text-muted-foreground">
					{expanded ? "Collapse" : "Expand"}
				</span>
			</button>
			{expanded ? (
				<div className="flex flex-col gap-2 py-2">
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={onBulkArchive}
						>
							Bulk archive
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={onMarkAllRead}
						>
							Mark all read
						</Button>
					</div>
					<ul className="flex flex-col gap-1">
						{messages.map((m) => (
							<li
								key={m.id}
								data-mail-id={m.id}
								className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
							>
								<span className="truncate">{pileRowCopy(m, clockNow)}</span>
								<span className="flex shrink-0 items-center gap-1">
									<Button
										size="sm"
										variant="ghost"
										disabled={busy}
										aria-label={`Archive ${m.subject || m.id}`}
										onClick={() =>
											archive.mutate({ ids: [m.id], townPath: tp })
										}
									>
										A
									</Button>
									<Button
										size="sm"
										variant="ghost"
										disabled={busy || m.read}
										aria-label={`Mark read ${m.subject || m.id}`}
										onClick={() =>
											markRead.mutate({ ids: [m.id], townPath: tp })
										}
									>
										M
									</Button>
								</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</section>
	);
}
