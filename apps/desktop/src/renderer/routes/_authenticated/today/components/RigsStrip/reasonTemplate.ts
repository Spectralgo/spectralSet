export type RigRefineryState = "idle" | "flowing" | "blocked";

export type RigReason =
	| { kind: "quiet" }
	| { kind: "stalled"; duration: string; readyCount: number }
	| { kind: "ready"; p0Count: number; refineryState: RigRefineryState }
	| { kind: "zombie"; count: number }
	| { kind: "offline"; lastSeenRelative: string };

export type RigDotState = "working" | "stalled" | "zombie";

export function reasonTemplate(r: RigReason): string {
	switch (r.kind) {
		case "quiet":
			return "all quiet";
		case "stalled":
			return `stalled polecat ${r.duration} · ${r.readyCount} ready work`;
		case "ready":
			return `${r.p0Count} P0 ready · refinery ${r.refineryState}`;
		case "zombie":
			return `${r.count} zombie · needs ack`;
		case "offline":
			return `unreachable · last seen ${r.lastSeenRelative}`;
	}
}

export function reasonDotState(r: RigReason): RigDotState {
	if (r.kind === "stalled") return "stalled";
	if (r.kind === "zombie" || r.kind === "offline") return "zombie";
	return "working";
}
