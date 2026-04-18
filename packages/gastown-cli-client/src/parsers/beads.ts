import { type Bead, beadListSchema } from "../types";

export function parseBeadList(stdout: string): Bead[] {
	const json = extractJsonArray(stdout);
	if (!json) return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return [];
	}

	if (!Array.isArray(parsed)) return [];

	const normalized = parsed
		.filter(
			(entry): entry is Record<string, unknown> =>
				typeof entry === "object" && entry !== null,
		)
		.map(normalizeBdListEntry);

	const strict = beadListSchema.safeParse(normalized);
	if (strict.success) return strict.data;

	return normalized.filter(
		(entry): entry is Bead =>
			typeof entry.id === "string" &&
			typeof entry.title === "string" &&
			typeof entry.type === "string" &&
			typeof entry.status === "string" &&
			typeof entry.priority === "number",
	);
}

function extractJsonArray(stdout: string): string | null {
	const start = stdout.indexOf("[");
	if (start < 0) return null;
	return stdout.slice(start);
}

function normalizeBdListEntry(entry: Record<string, unknown>): Bead {
	const rawLabels = entry.labels;
	const labels =
		Array.isArray(rawLabels) && rawLabels.every((l) => typeof l === "string")
			? (rawLabels as string[])
			: undefined;
	const rawAssignee = entry.assignee;
	const assignee = typeof rawAssignee === "string" ? rawAssignee : undefined;

	return {
		id: String(entry.id ?? ""),
		title: String(entry.title ?? ""),
		type: String(entry.issue_type ?? entry.type ?? ""),
		priority:
			typeof entry.priority === "number"
				? entry.priority
				: Number.parseInt(String(entry.priority ?? "0"), 10) || 0,
		status: String(entry.status ?? ""),
		labels,
		assignee,
	};
}
