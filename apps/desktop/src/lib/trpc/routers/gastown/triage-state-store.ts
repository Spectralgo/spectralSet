// Persists Today triage Ack/Snooze decisions across Electron window reloads.
// Backed by a JSON file in <userData>/triage-state.json. Card IDs are mail
// IDs today; future bead/convoy card types share the same keyspace.

export interface TriageStateData {
	acked: Record<string, { at: number }>;
	snoozed: Record<string, { until: number }>;
}

export interface TriageStateStore {
	load(): TriageStateData;
	ack(cardId: string, now: number): void;
	snooze(cardId: string, until: number): void;
	isHidden(cardId: string, now: number): boolean;
}

export interface TriageStateStoreDeps {
	readFile: () => string | null;
	writeFile: (data: string) => void;
}

const EMPTY: TriageStateData = { acked: {}, snoozed: {} };

function parse(raw: string | null): TriageStateData {
	if (!raw) return { acked: {}, snoozed: {} };
	try {
		const parsed = JSON.parse(raw) as Partial<TriageStateData>;
		return {
			acked: { ...(parsed.acked ?? {}) },
			snoozed: { ...(parsed.snoozed ?? {}) },
		};
	} catch {
		return { acked: {}, snoozed: {} };
	}
}

export function createTriageStateStore(
	deps: TriageStateStoreDeps,
): TriageStateStore {
	let state = parse(deps.readFile());
	const persist = () => deps.writeFile(JSON.stringify(state));
	return {
		load: () => state,
		ack(cardId, now) {
			state = {
				acked: { ...state.acked, [cardId]: { at: now } },
				snoozed: state.snoozed,
			};
			persist();
		},
		snooze(cardId, until) {
			state = {
				acked: state.acked,
				snoozed: { ...state.snoozed, [cardId]: { until } },
			};
			persist();
		},
		isHidden(cardId, now) {
			if (state.acked[cardId]) return true;
			const s = state.snoozed[cardId];
			return s !== undefined && s.until > now;
		},
	};
}

export const noopTriageStateStore: TriageStateStore = {
	load: () => EMPTY,
	ack: () => {},
	snooze: () => {},
	isHidden: () => false,
};
