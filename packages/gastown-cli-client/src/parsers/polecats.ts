import type { Polecat, PolecatState } from "../types";

const POLECAT_LINE_RE = /^[●○]\s+(\S+)\/(\S+)\s+(\S+)\s*$/u;
const BEAD_LINE_RE = /^([a-z0-9][a-z0-9-]+)\s*$/iu;

const KNOWN_STATES: readonly PolecatState[] = [
	"working",
	"stalled",
	"zombie",
	"idle",
	"done",
	"nuked",
];

export function parsePolecatList(stdout: string): Polecat[] {
	const lines = stdout.split(/\r?\n/);
	const polecats: Polecat[] = [];

	let current: Polecat | null = null;

	const commit = () => {
		if (current) {
			polecats.push(current);
			current = null;
		}
	};

	for (const raw of lines) {
		const trimmed = raw.trim();
		if (trimmed.length === 0) continue;

		const polecatMatch = trimmed.match(POLECAT_LINE_RE);
		if (polecatMatch) {
			commit();
			const rig = polecatMatch[1];
			const name = polecatMatch[2];
			const stateWord = polecatMatch[3]?.toLowerCase() ?? "";
			if (!rig || !name) continue;
			const state = isKnownState(stateWord) ? stateWord : null;
			if (!state) continue;
			current = { rig, name, state };
			continue;
		}

		if (current) {
			const beadMatch = trimmed.match(BEAD_LINE_RE);
			if (beadMatch?.[1]) {
				current = { ...current, currentBead: beadMatch[1] };
			}
		}
	}

	commit();

	return polecats;
}

function isKnownState(word: string): word is PolecatState {
	return (KNOWN_STATES as readonly string[]).includes(word);
}
