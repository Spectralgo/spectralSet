// Backoff schedule for gastown.* queries: 10s → 20s → 40s → 60s → 60s.
// Picked to match the probe hook's poll cadence (useGastownProbe) so a
// `gt` outage produces one consistent reconnect rhythm across the app.
export const RETRY_BASE_MS = 10_000;
export const RETRY_CAP_MS = 60_000;
export const MAX_RETRIES = 5;
export const GASTOWN_TOAST_ID = "gastown-connection";

export function shouldRetryQuery(
	failureCount: number,
	_error: unknown,
): boolean {
	return failureCount < MAX_RETRIES;
}

export function nextRetryDelay(retryAttempt: number): number {
	return Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** retryAttempt);
}

// tRPC v10 emits keys shaped like `[["gastown","probe"], { type: "query" }]`.
// Plain react-query callers may pass `["gastown", ...]` directly. Match both
// so non-gastown queries (settings, workspaces…) keep their fail-fast behavior.
export function isGastownQueryKey(queryKey: readonly unknown[]): boolean {
	const head = queryKey[0];
	if (Array.isArray(head)) return head[0] === "gastown";
	return head === "gastown";
}

export interface ToastSink {
	error(msg: string, opts?: { id: string }): void;
	success(msg: string, opts?: { id: string }): void;
}

export interface GastownToastCoalescer {
	isFailing(): boolean;
	onQueryError(queryKey: readonly unknown[]): void;
	onQuerySuccess(queryKey: readonly unknown[]): void;
}

// Coalesces gastown.* query failures into a single "Reconnecting…" toast and
// fires "Reconnected" on the first success after a failure window. Re-using
// the same toast id lets sonner replace the toast in place rather than
// stacking N "Failed to load" toasts during a `gt` outage.
export function createGastownToastCoalescer(
	toast: ToastSink,
): GastownToastCoalescer {
	let failing = false;
	return {
		isFailing: () => failing,
		onQueryError(queryKey) {
			if (!isGastownQueryKey(queryKey)) return;
			failing = true;
			toast.error("Reconnecting…", { id: GASTOWN_TOAST_ID });
		},
		onQuerySuccess(queryKey) {
			if (!isGastownQueryKey(queryKey)) return;
			if (!failing) return;
			failing = false;
			toast.success("Reconnected", { id: GASTOWN_TOAST_ID });
		},
	};
}
