import { Button } from "@spectralset/ui/button";
import { toast } from "@spectralset/ui/sonner";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ElectronRouterOutputs } from "renderer/lib/electron-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useTriageKeybindings } from "./useTriageKeybindings";

export type TriageCard =
	ElectronRouterOutputs["gastown"]["today"]["triage"]["cards"][number];
export interface TriageStackQueryState {
	data: ElectronRouterOutputs["gastown"]["today"]["triage"] | undefined;
	isLoading: boolean;
	isError: boolean;
	refetch: () => Promise<unknown> | unknown;
}

const ACTIONS = ["Ack", "Open", "Snooze"] as const;
type Action = (typeof ACTIONS)[number];

const SNOOZE_TTL_MS = 15 * 60 * 1000;

export function formatAge(ageMs: number): string {
	const s = Math.max(0, Math.floor(ageMs / 1000));
	if (s <= 5) return "just now";
	if (s <= 59) return `${s}s ago`;
	if (s <= 3599) return `${Math.floor(s / 60)}m ago`;
	if (s <= 86399) return `${Math.floor(s / 3600)}h ago`;
	return `${Math.floor(s / 86400)}d ago`;
}

export function cardTitle(c: TriageCard): string {
	return c.type === "pinned-mail" ? c.subject || "(no subject)" : c.title;
}

export function cardSource(c: TriageCard): string {
	if (c.type === "incident") return c.sourceAddress;
	if (c.type === "pinned-mail") return c.sender;
	return [c.rig, c.polecat].filter(Boolean).join("/") || "—";
}

export function TriageStack({ query }: { query: TriageStackQueryState }) {
	const navigate = useNavigate();
	const [optimisticHidden, setOptimisticHidden] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const removeOptimistic = (id: string) =>
		setOptimisticHidden((prev) => {
			if (!prev.has(id)) return prev;
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	const ack = electronTrpc.gastown.today.ackCard.useMutation({
		onSuccess: (_data, vars) => {
			void Promise.resolve(query.refetch()).finally(() =>
				removeOptimistic(vars.cardId),
			);
		},
		onError: (e, vars) => {
			removeOptimistic(vars.cardId);
			toast.error(e.message || "Ack failed");
		},
	});
	const snooze = electronTrpc.gastown.today.snoozeCard.useMutation({
		onSuccess: (_data, vars) => {
			void Promise.resolve(query.refetch()).finally(() =>
				removeOptimistic(vars.cardId),
			);
		},
		onError: (e, vars) => {
			removeOptimistic(vars.cardId);
			toast.error(e.message || "Snooze failed");
		},
	});
	const openCard = electronTrpc.gastown.today.openCard.useMutation({
		onSuccess: (result) => {
			if (result.type === "mail") {
				void navigate({ to: "/gastown/mail" });
				return;
			}
			toast.message(`${result.type} navigation not yet wired`);
		},
		onError: (e) => toast.error(e.message || "Open failed"),
	});
	const [focusIdx, setFocusIdx] = useState(0);
	const visible = useMemo<TriageCard[]>(
		() => (query.data?.cards ?? []).filter((c) => !optimisticHidden.has(c.id)),
		[query.data?.cards, optimisticHidden],
	);
	const safeIdx =
		visible.length === 0 ? 0 : Math.min(focusIdx, visible.length - 1);
	const focused = visible[safeIdx];

	const dispatch = (c: TriageCard, action: Action) => {
		if (action === "Open") {
			openCard.mutate({ cardId: c.id });
			return;
		}
		setOptimisticHidden((prev) => new Set(prev).add(c.id));
		if (action === "Ack") ack.mutate({ cardId: c.id });
		else snooze.mutate({ cardId: c.id, ttlMs: SNOOZE_TTL_MS });
	};

	useTriageKeybindings({
		enabled: visible.length > 0,
		onMove: (d) =>
			setFocusIdx((i) => Math.max(0, Math.min(visible.length - 1, i + d))),
		onAck: () => focused && dispatch(focused, "Ack"),
		onOpen: () => focused && dispatch(focused, "Open"),
		onSnooze: () => focused && dispatch(focused, "Snooze"),
	});

	let body: React.ReactNode;
	if (query.isLoading) {
		body = (
			<ul className="flex flex-col gap-2">
				{[0, 1, 2].map((i) => (
					<li
						key={i}
						data-testid="triage-skeleton"
						className="h-10 animate-pulse rounded-md bg-muted/40"
					/>
				))}
			</ul>
		);
	} else if (query.isError) {
		body = (
			<div className="flex items-center gap-3 text-sm text-destructive">
				<span>Failed to load triage.</span>
				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						void query.refetch();
					}}
				>
					Retry
				</Button>
			</div>
		);
	} else if (visible.length === 0) {
		body = (
			<p className="text-sm text-muted-foreground">
				All clear — nothing to triage
			</p>
		);
	} else {
		body = (
			<ul className="flex flex-col gap-2">
				{visible.map((card, i) => {
					const focusedRow = i === safeIdx;
					const title = cardTitle(card);
					return (
						<li
							key={card.id}
							data-card-id={card.id}
							data-focused={focusedRow || undefined}
							className={`flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm ${focusedRow ? "bg-accent" : "bg-background"}`}
						>
							<button
								type="button"
								onClick={() => setFocusIdx(i)}
								className="flex min-w-0 flex-1 items-center gap-3 text-left"
							>
								<span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium uppercase text-muted-foreground">
									{card.severity}
								</span>
								<span className="truncate text-foreground">{title}</span>
								<span className="shrink-0 text-xs text-muted-foreground">
									{cardSource(card)} · {formatAge(card.ageMs)}
								</span>
							</button>
							<span className="flex shrink-0 items-center gap-1">
								{ACTIONS.map((a) => (
									<Button
										key={a}
										size="sm"
										variant="ghost"
										aria-label={`${a} ${title}`}
										onClick={() => dispatch(card, a)}
									>
										{a}
									</Button>
								))}
							</span>
						</li>
					);
				})}
			</ul>
		);
	}

	return (
		<section aria-label="Triage" data-testid="triage-stack" className="mb-8">
			{body}
		</section>
	);
}
