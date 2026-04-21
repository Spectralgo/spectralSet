export type DigestPayload =
	| { firstLaunch: true }
	| {
			firstLaunch?: false;
			sinceTime: string;
			mergedCount: number;
			awaitingReviewCount: number;
			escalationsAckedCount: number;
			polecatsAliveCount: number;
	  };

export interface TodayMastheadProps {
	digest: DigestPayload | undefined;
	lastVerifiedAt: Date | null;
	isStale: boolean;
	now?: Date;
}

export function formatRelative(from: Date, now: Date): string {
	const delta = Math.max(
		0,
		Math.floor((now.getTime() - from.getTime()) / 1000),
	);
	if (delta <= 5) return "just now";
	if (delta <= 59) return `${delta}s ago`;
	if (delta <= 3599) return `${Math.floor(delta / 60)}m ago`;
	return `${Math.floor(delta / 3600)}h ago`;
}

export function formatClockTime(d: Date): string {
	const h24 = d.getHours();
	const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
	const mm = d.getMinutes().toString().padStart(2, "0");
	return `${h12}:${mm}${h24 >= 12 ? "pm" : "am"}`;
}

function sinceYouSleptCopy(digest: DigestPayload | undefined): string {
	if (digest === undefined || "firstLaunch" in digest) {
		return "Welcome back. Fetching overnight…";
	}
	const time = formatClockTime(new Date(digest.sinceTime));
	const {
		mergedCount: m,
		awaitingReviewCount: a,
		escalationsAckedCount: e,
		polecatsAliveCount: p,
	} = digest;
	if (m === 0 && a === 0 && e === 0 && p === 0) {
		return `Since ${time}: nothing landed. All agents held.`;
	}
	return `Since ${time}: ${m} merged · ${a} awaiting review · ${e} escalations acked · ${p} alive`;
}

export function TodayMasthead({
	digest,
	lastVerifiedAt,
	isStale,
	now,
}: TodayMastheadProps) {
	const clock = now ?? new Date();
	const verifiedLabel =
		lastVerifiedAt === null
			? null
			: isStale
				? `Stale since ${formatClockTime(lastVerifiedAt)}`
				: `Last verified ${formatRelative(lastVerifiedAt, clock)}`;
	return (
		<header className="flex flex-col gap-2 px-6 py-4">
			<div className="flex items-baseline justify-between gap-3">
				<h1 className="text-xl font-semibold text-foreground">Today</h1>
				{verifiedLabel !== null && (
					<span className="text-xs font-medium text-muted-foreground">
						{verifiedLabel}
					</span>
				)}
			</div>
			<p className="text-sm text-foreground">{sinceYouSleptCopy(digest)}</p>
		</header>
	);
}
