import { toast } from "@spectralset/ui/sonner";
import { useEffect, useRef } from "react";
import { useGastownConnectionState } from "renderer/hooks/useGastownConnectionState";

function formatLastSeen(lastSeenAt: Date | null, now: number): string {
	if (!lastSeenAt) return "—";
	const seconds = Math.max(0, Math.round((now - lastSeenAt.getTime()) / 1000));
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.round(seconds / 60);
	return `${minutes}m ago`;
}

export function GastownOfflineBanner() {
	const { state, lastSeenAt, retryNow, enabled } = useGastownConnectionState();
	const prevStateRef = useRef(state);

	useEffect(() => {
		if (prevStateRef.current !== "connected" && state === "connected") {
			toast.success("Reconnected to Gas Town");
		}
		prevStateRef.current = state;
	}, [state]);

	if (!enabled || state === "connected") return null;

	const label =
		state === "offline" ? "Gas Town offline" : "Gas Town reconnecting";
	const seen = formatLastSeen(lastSeenAt, Date.now());

	return (
		<output
			aria-live="polite"
			data-testid="gastown-offline-banner"
			className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-700 backdrop-blur-sm dark:text-amber-300"
		>
			<span className="font-medium">{label}</span>
			<span className="text-amber-700/80 dark:text-amber-300/80">
				· last seen {seen}
			</span>
			<button
				type="button"
				onClick={retryNow}
				className="rounded border border-amber-600/50 px-2 py-0.5 text-[11px] font-medium hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
			>
				Retry now
			</button>
		</output>
	);
}
