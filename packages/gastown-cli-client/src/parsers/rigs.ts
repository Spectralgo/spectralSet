import type { Rig } from "../types";

const RIG_HEADER_RE = /^([🟢⚫])\s+(\S.*)$/u;
const STATUS_LINE_RE =
	/Witness:\s*([●○])\s*(\S+)\s+Refinery:\s*([●○])\s*(\S+)/u;
const COUNTS_LINE_RE = /Polecats:\s*(\d+)\s+Crew:\s*(\d+)/u;

export function parseRigList(stdout: string): Rig[] {
	const lines = stdout.split(/\r?\n/);
	const rigs: Rig[] = [];

	let current: Partial<Rig> | null = null;
	let sawStatus = false;
	let sawCounts = false;

	const commit = () => {
		if (current && typeof current.name === "string" && sawStatus && sawCounts) {
			rigs.push({
				name: current.name,
				witnessRunning: current.witnessRunning ?? false,
				refineryRunning: current.refineryRunning ?? false,
				polecatCount: current.polecatCount ?? 0,
				crewCount: current.crewCount ?? 0,
				agents: [],
			});
		}
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		const header = line.match(RIG_HEADER_RE);
		if (header) {
			commit();
			current = { name: header[2]?.trim() };
			sawStatus = false;
			sawCounts = false;
			continue;
		}

		if (!current) continue;

		const status = line.match(STATUS_LINE_RE);
		if (status) {
			current.witnessRunning = isRunningWord(status[2]) && status[1] === "●";
			current.refineryRunning = isRunningWord(status[4]) && status[3] === "●";
			sawStatus = true;
			continue;
		}

		const counts = line.match(COUNTS_LINE_RE);
		if (counts) {
			current.polecatCount = Number.parseInt(counts[1] ?? "0", 10);
			current.crewCount = Number.parseInt(counts[2] ?? "0", 10);
			sawCounts = true;
		}
	}

	commit();

	return rigs;
}

function isRunningWord(word: string | undefined): boolean {
	return word?.toLowerCase() === "running";
}
