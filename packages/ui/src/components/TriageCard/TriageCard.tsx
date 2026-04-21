"use client";

import { Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";

type TriageCardKind = "incident" | "rejection" | "pinned-mail";
type TriageSeverity = "HIGH" | "CRITICAL" | "REJECT" | "PINNED";

interface TriageCardProps {
	kind: TriageCardKind;
	severity: TriageSeverity;
	title: string;
	meta: string;
	onAck?: () => void;
	onOpen?: () => void;
	onSnooze?: () => void;
	onUndo?: () => void;
	ackedAt?: string;
	undoWindowMs?: number;
}

const SEVERITY_CHIP_CLASS: Record<TriageSeverity, string> = {
	HIGH: "bg-destructive text-destructive-foreground",
	CRITICAL:
		"bg-destructive text-destructive-foreground animate-pulse motion-reduce:animate-none",
	REJECT: "bg-amber-500/20 text-amber-500",
	PINNED: "bg-muted text-muted-foreground",
};

function formatNow(): string {
	return new Date().toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

function TriageCard({
	kind,
	severity,
	title,
	meta,
	onAck,
	onOpen,
	onSnooze,
	onUndo,
	ackedAt,
	undoWindowMs = 6000,
}: TriageCardProps) {
	const [internalAckTime, setInternalAckTime] = useState<string | null>(null);
	const [remainingMs, setRemainingMs] = useState<number>(undoWindowMs);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const ackTimeLabel = ackedAt ?? internalAckTime;

	useEffect(() => {
		if (!ackTimeLabel) {
			setRemainingMs(undoWindowMs);
			return;
		}
		const start = Date.now();
		setRemainingMs(undoWindowMs);
		intervalRef.current = setInterval(() => {
			const next = Math.max(0, undoWindowMs - (Date.now() - start));
			setRemainingMs(next);
			if (next <= 0 && intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}, 100);
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [ackTimeLabel, undoWindowMs]);

	const handleAck = () => {
		if (!ackedAt) setInternalAckTime(formatNow());
		onAck?.();
	};

	const handleUndo = () => {
		setInternalAckTime(null);
		onUndo?.();
	};

	if (ackTimeLabel) {
		const undoActive = remainingMs > 0;
		const secondsLeft = Math.ceil(remainingMs / 1000);
		return (
			<Card
				data-slot="triage-card"
				data-kind={kind}
				data-state="acked"
				className="bg-card flex-row items-center gap-2 px-3 py-2 shadow-none"
			>
				<span
					aria-live="polite"
					className="text-xs font-medium text-muted-foreground"
				>
					{`Acked · ${ackTimeLabel}`}
				</span>
				{undoActive ? (
					<button
						type="button"
						onClick={handleUndo}
						className="text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
						aria-label={`Undo · ${secondsLeft}s left`}
					>
						{`Undo · ${secondsLeft}s`}
					</button>
				) : null}
			</Card>
		);
	}

	const isPinnedMail = kind === "pinned-mail";

	return (
		<Card
			data-slot="triage-card"
			data-kind={kind}
			data-severity={severity}
			className="bg-card gap-2 px-3 py-3 shadow-none"
		>
			<div className="flex items-start gap-2">
				{isPinnedMail ? (
					<Mail
						aria-hidden="true"
						className="size-4 shrink-0 text-muted-foreground"
					/>
				) : (
					<span
						className={cn(
							"inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium",
							SEVERITY_CHIP_CLASS[severity],
						)}
					>
						{severity}
					</span>
				)}
				<div className="min-w-0 flex-1">
					<div className="text-sm font-normal text-card-foreground truncate">
						{title}
					</div>
					<div className="text-xs font-medium text-muted-foreground truncate">
						{meta}
					</div>
				</div>
			</div>
			<div className="flex items-center gap-1">
				<Button size="xs" variant="default" onClick={handleAck}>
					Ack
				</Button>
				<Button size="xs" variant="ghost" onClick={onOpen}>
					Open
				</Button>
				<Button size="xs" variant="ghost" onClick={onSnooze}>
					Snooze
				</Button>
			</div>
		</Card>
	);
}

export { TriageCard };
export type { TriageCardKind, TriageCardProps, TriageSeverity };
