import {
	formatNextCheck,
	formatVerdictRelative,
	type VerdictState,
} from "./verdict";

export interface VerdictTailProps {
	state: VerdictState;
	lastVerifiedAt?: Date | null;
	now?: Date;
	nextCheckInMs?: number;
	loading?: boolean;
	error?: boolean;
}

export function VerdictTail({
	state,
	lastVerifiedAt,
	now,
	nextCheckInMs = 30_000,
	loading,
	error,
}: VerdictTailProps) {
	if (loading) {
		return (
			<output
				aria-label="Verdict"
				data-testid="verdict-tail"
				data-state="loading"
				className="flex items-center justify-center gap-2 pt-12 pb-8"
			>
				<span
					aria-hidden="true"
					className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
				/>
				<span className="text-base text-muted-foreground">Checking…</span>
			</output>
		);
	}
	if (error) {
		return (
			<output
				aria-label="Verdict"
				data-testid="verdict-tail"
				data-state="error"
				className="block pt-12 pb-8 text-center text-base text-muted-foreground"
			>
				—
			</output>
		);
	}
	if (state === "red-suppressed") return null;
	const clockNow = now ?? new Date();
	if (state === "all-green") {
		const rel = lastVerifiedAt
			? formatVerdictRelative(lastVerifiedAt, clockNow)
			: "just now";
		return (
			<output
				aria-label="Verdict"
				data-testid="verdict-tail"
				data-state="all-green"
				className="block pt-12 pb-8 text-center text-base font-medium text-green-500"
			>
				{`Everything is fine. Last verified ${rel}.`}
			</output>
		);
	}
	const nextCheckAt = new Date(clockNow.getTime() + nextCheckInMs);
	return (
		<output
			aria-label="Verdict"
			data-testid="verdict-tail"
			data-state="amber-with-plan"
			className="block pt-12 pb-8 text-center text-base font-medium text-amber-500"
		>
			{`All attended. Next check ${formatNextCheck(nextCheckAt)}.`}
		</output>
	);
}
